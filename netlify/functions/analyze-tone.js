exports.handler = async (event, context) => {
  console.log('Function called!');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request received');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.log('Non-POST request received:', event.httpMethod);
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    console.log('Processing POST request...');
    
    // Check if we have request body
    if (!event.body) {
      console.error('No request body received');
      throw new Error('No request body');
    }
    
    const { email } = JSON.parse(event.body);
    console.log('Email received:', email ? 'Yes' : 'No');
    console.log('Email length:', email ? email.length : 0);
    
    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key starts with AIza:', apiKey ? apiKey.startsWith('AIza') : false);
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    console.log('Gemini URL prepared');
    
    const prompt = `Analyze the tone of this email and provide 3 improved versions. Respond ONLY with valid JSON in this exact format:

{
  "analysis": "Brief analysis of current tone (1-2 sentences)",
  "professional": "Professional version of the email",
  "friendly": "Friendly version of the email",
  "concise": "Concise version of the email"
}

Email to analyze: "${email}"

Remember: Return only valid JSON, no additional text or formatting.`;

    console.log('Making request to Gemini API...');
    
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

    console.log('Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    
    // Check if response has expected structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', JSON.stringify(data));
      throw new Error('Unexpected response structure from Gemini');
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Generated text length:', generatedText.length);
    console.log('Generated text preview:', generatedText.substring(0, 100));
    
    let result;
    try {
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedText);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError.message);
      console.log('Raw generated text:', generatedText);
      
      // Fallback response
      result = {
        analysis: "Unable to analyze tone - please try again",
        professional: `Dear [Recipient], ${email} Thank you for your consideration.`,
        friendly: `Hi! ${email} Thanks so much!`,
        concise: `${email} Please advise.`
      };
      console.log('Using fallback response');
    }
    
    console.log('Returning successful response');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Error stack:', error.stack);
    
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