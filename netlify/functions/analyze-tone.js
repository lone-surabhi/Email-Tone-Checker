exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const prompt = `Analyze the tone of this email and provide 3 improved versions. Respond ONLY with valid JSON in this exact format:

{
  "analysis": "Brief analysis of current tone (1-2 sentences)",
  "professional": "Professional version of the email",
  "friendly": "Friendly version of the email",
  "concise": "Concise version of the email"
}

Email to analyze: "${email}"

Remember: Return only valid JSON, no additional text or formatting.`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    let result;
    try {
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      result = {
        analysis: "Unable to analyze tone - please try again",
        professional: `Dear [Recipient], ${email} Thank you for your consideration.`,
        friendly: `Hi! ${email} Thanks so much!`,
        concise: `${email} Please advise.`
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze email',
        details: error.message 
      })
    };
  }
};