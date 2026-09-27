export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      recipientName,
      senderName,
      message,
      style
    } = req.body || {};

    if (!recipientName) {
      return res.status(400).json({
        error: "Recipient name is required"
      });
    }

    // Create personalized birthday lyrics
    const lyrics = `
Happy birthday to you,
Happy birthday dear ${recipientName},
May your dreams and wishes all come true,
And may happiness always stay with you.

Today we celebrate ${recipientName},
A special day filled with joy,
May laughter, love and happiness
Follow you wherever you go.

${message ? message : "Wishing you a wonderful birthday!"}

Happy birthday ${recipientName}!

With love,
${senderName || "Someone special"}
    `.trim();

    /*
      V2 BACKEND

      This endpoint currently creates the personalized
      song lyrics and returns them to the website.

      Later we will connect the audio/music generation
      service here without exposing its API key in index.html.
    */

    return res.status(200).json({
      success: true,
      recipientName,
      senderName: senderName || "",
      style: style || "Happy Pop",
      lyrics,
      audioUrl: null
    });

  } catch (error) {
    console.error("Generate song error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to generate song"
    });
  }
}
