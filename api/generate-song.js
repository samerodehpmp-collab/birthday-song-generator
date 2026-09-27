// api/generate-song.js

const MUREKA_BASE_URL = "https://api.mureka.ai";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findAudioUrl(data) {
  if (!data) return null;

  // Check the common locations returned by Mureka
  const choices = Array.isArray(data.choices) ? data.choices : [];

  for (const choice of choices) {
    const url =
      choice?.url ||
      choice?.audio_url ||
      choice?.audioUrl ||
      choice?.mp3_url ||
      choice?.song_url;

    if (url) return url;
  }

  return (
    data?.url ||
    data?.audio_url ||
    data?.audioUrl ||
    data?.mp3_url ||
    null
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // ----------------------------------------
    // CHECK MUREKA API KEY
    // ----------------------------------------

    const apiKey = process.env.MUREKA_API_KEY;

    if (!apiKey) {
      console.error("MUREKA_API_KEY is missing");

      return res.status(500).json({
        success: false,
        error: "Mureka API key is not configured.",
      });
    }

    // ----------------------------------------
    // GET FORM DATA
    // ----------------------------------------

    const {
      recipientName,
      senderName,
      style,
      message,
    } = req.body || {};

    if (!recipientName || !recipientName.trim()) {
      return res.status(400).json({
        success: false,
        error: "Recipient name is required.",
      });
    }

    const cleanRecipient = recipientName.trim();

    const cleanSender =
      senderName && senderName.trim()
        ? senderName.trim()
        : "Someone special";

    const cleanStyle =
      style && style.trim()
        ? style.trim()
        : "Happy Pop";

    const cleanMessage =
      message && message.trim()
        ? message.trim()
        : "Wishing you happiness, laughter and an amazing year ahead.";

    // ----------------------------------------
    // CREATE PERSONALIZED LYRICS
    // ----------------------------------------

    const lyrics = `[Verse]
Today is a special day,
A celebration just for you,
Happy birthday ${cleanRecipient},
May all your dreams come true.

[Chorus]
Happy birthday ${cleanRecipient},
Everybody sing your name,
Happy birthday ${cleanRecipient},
Let's celebrate your special day!

[Verse]
May your day be filled with laughter,
Happiness in every way,
${cleanMessage}

[Chorus]
Happy birthday ${cleanRecipient},
Everybody sing along,
Happy birthday ${cleanRecipient},
This is your birthday song!

[Outro]
Happy birthday ${cleanRecipient}!

With love from ${cleanSender}.`;

    // ----------------------------------------
    // BUILD MUSIC PROMPT
    // ----------------------------------------

    const stylePrompts = {
      Kids:
        "fun cheerful children's birthday song, playful, upbeat, catchy melody, joyful vocals, colorful instrumentation",

      "Happy Pop":
        "happy upbeat pop birthday song, catchy chorus, energetic, joyful vocals",

      Romantic:
        "romantic warm birthday song, emotional vocals, piano, acoustic guitar, gentle pop",

      Rock:
        "energetic birthday rock song, electric guitars, drums, powerful vocals",

      Dance:
        "upbeat dance birthday song, electronic pop, energetic beat, party atmosphere",

      Acoustic:
        "warm acoustic birthday song, acoustic guitar, gentle percussion, intimate vocals",

      Jazz:
        "smooth jazz birthday song, piano, bass, drums, elegant warm vocals",
    };

    const musicPrompt =
      stylePrompts[cleanStyle] ||
      `${cleanStyle} birthday song, joyful, catchy, professional production`;

    // ----------------------------------------
    // SEND SONG TO MUREKA
    // ----------------------------------------

    console.log("Starting Mureka generation...");

    const generateResponse = await fetch(
      `${MUREKA_BASE_URL}/v1/song/generate`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          lyrics,
          model: "auto",
          prompt: musicPrompt,

          // Generate only one song to reduce API cost
          n: 1,
        }),
      }
    );

    const generateText = await generateResponse.text();

    let generateData;

    try {
      generateData = JSON.parse(generateText);
    } catch {
      generateData = null;
    }

    if (!generateResponse.ok) {
      console.error(
        "Mureka generation error:",
        generateResponse.status,
        generateText
      );

      return res.status(502).json({
        success: false,
        error:
          generateData?.error?.message ||
          generateData?.message ||
          `Mureka returned HTTP ${generateResponse.status}`,
      });
    }

    console.log("Mureka generation response:", generateData);

    const taskId = generateData?.id;

    if (!taskId) {
      return res.status(502).json({
        success: false,
        error: "Mureka did not return a task ID.",
        details: generateData,
      });
    }

    // ----------------------------------------
    // CHECK IF AUDIO ALREADY EXISTS
    // ----------------------------------------

    let audioUrl = findAudioUrl(generateData);

    if (audioUrl) {
      return res.status(200).json({
        success: true,
        status: "audio-ready",
        taskId,
        recipientName: cleanRecipient,
        senderName: cleanSender,
        style: cleanStyle,
        message: cleanMessage,
        lyrics,
        audioUrl,
      });
    }

    // ----------------------------------------
    // POLL MUREKA FOR FINISHED SONG
    // ----------------------------------------

    // Maximum ~50 seconds
    const MAX_ATTEMPTS = 10;
    const WAIT_TIME = 5000;

    let latestTask = generateData;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await sleep(WAIT_TIME);

      console.log(
        `Checking Mureka task ${taskId}, attempt ${
          attempt + 1
        }/${MAX_ATTEMPTS}`
      );

      const queryResponse = await fetch(
        `${MUREKA_BASE_URL}/v1/song/query/${encodeURIComponent(
          taskId
        )}`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const queryText = await queryResponse.text();

      let queryData;

      try {
        queryData = JSON.parse(queryText);
      } catch {
        queryData = null;
      }

      if (!queryResponse.ok) {
        console.error(
          "Mureka query error:",
          queryResponse.status,
          queryText
        );

        continue;
      }

      latestTask = queryData;

      console.log(
        "Mureka task status:",
        latestTask?.status
      );

      // Try finding the audio on every response
      audioUrl = findAudioUrl(latestTask);

      if (audioUrl) {
        return res.status(200).json({
          success: true,
          status: "audio-ready",
          taskId,
          recipientName: cleanRecipient,
          senderName: cleanSender,
          style: cleanStyle,
          message: cleanMessage,
          lyrics,
          audioUrl,
        });
      }

      // Generation failed
      if (
        latestTask?.status === "failed" ||
        latestTask?.status === "timeouted" ||
        latestTask?.status === "cancelled"
      ) {
        return res.status(502).json({
          success: false,
          status: latestTask.status,
          taskId,
          error:
            latestTask?.failed_reason ||
            "Mureka song generation failed.",
        });
      }
    }

    // ----------------------------------------
    // STILL GENERATING
    // ----------------------------------------

    return res.status(202).json({
      success: true,
      status: "processing",
      taskId,

      recipientName: cleanRecipient,
      senderName: cleanSender,
      style: cleanStyle,
      message: cleanMessage,

      lyrics,

      audioUrl: null,

      messageToUser:
        "Your birthday song is still being generated.",
    });

  } catch (error) {
    console.error("Generate song error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Unable to generate song.",
    });
  }
}
