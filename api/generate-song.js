// api/generate-song.js

export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      recipientName,
      senderName,
      style,
      message
    } = req.body || {};

    // Recipient name is required
    if (!recipientName || !recipientName.trim()) {
      return res.status(400).json({
        success: false,
        error: "Recipient name is required",
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

    /*
      -------------------------------------------
      PERSONALIZED BIRTHDAY SONG
      -------------------------------------------
    */

    const lyrics = `
Happy birthday ${cleanRecipient},
Today is your special day.

We are here to celebrate you,
And send some happiness your way.

Happy birthday ${cleanRecipient},
May your dreams all come true.

May your day be filled with laughter,
And wonderful memories too.

${cleanMessage}

So turn the music up,
Let everybody sing.

Happy birthday ${cleanRecipient},
Let's celebrate everything!

Happy birthday ${cleanRecipient}!

With love,
${cleanSender}
    `.trim();

    /*
      -------------------------------------------
      AUDIO GENERATION
      -------------------------------------------

      The website/backend is now ready.

      In the next stage we connect an audio
      provider here.

      IMPORTANT:
      API keys must be stored in Vercel
      Environment Variables and never inside
      index.html.

      When the audio provider returns an MP3,
      replace audioUrl below with the generated
      audio URL.
    */

    const audioUrl = null;

    /*
      -------------------------------------------
      RESPONSE TO WEBSITE
      -------------------------------------------
    */

    return res.status(200).json({
      success: true,

      recipientName: cleanRecipient,
      senderName: cleanSender,
      style: cleanStyle,
      message: cleanMessage,

      lyrics,

      audioUrl,

      status: audioUrl
        ? "audio-ready"
        : "lyrics-ready",
    });

  } catch (error) {
    console.error("Generate song error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to generate song",
    });
  }
}
