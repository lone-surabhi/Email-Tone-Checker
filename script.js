let currentEmailText = '';
let analysisResults = null;

console.log("Email Tone Checker script loaded successfully!");

async function analyzeEmail() {
    console.log("Analyze button clicked!");
    
    const emailText = document.getElementById('emailInput').value.trim();
    console.log("Email text:", emailText);

    if (!emailText) {
        showMessage("Please enter an email draft to analyze.", "error");
        return;
    }
    
    if (emailText.length < 10) {
        showMessage("Please enter a longer email (at least 10 characters).", "error");
        return;
    }

    clearMessages();

    setLoadingState(true);
    console.log("Loading state activated");
    
    currentEmailText = emailText;
    
    try {
        console.log("Calling Google's AI...");
        
        const response = await fetch('/.netlify/functions/analyze-tone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: emailText })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();
        console.log("Google AI results:", results);
        
        if (results.error) {
            throw new Error(results.error);
        }
        
        const formattedResults = {
            analysis: results.analysis || "Analysis completed",
            suggestions: {
                professional: results.professional || "Professional version not available",
                friendly: results.friendly || "Friendly version not available",
                concise: results.concise || "Concise version not available"
            }
        };
        
        displayResults(formattedResults);
        console.log("Results displayed successfully!");
        
    } catch (error) {
        console.error('AI analysis failed:', error);
        showMessage(`AI analysis failed: ${error.message}. Please try again.`, 'error');
        
        console.log("Using backup fake results...");
        const mockResults = generateMockAnalysis(emailText);
        displayResults(mockResults);
    } finally {
        setLoadingState(false);
        console.log("Loading state deactivated");
    }
}

function generateMockAnalysis(emailText) {
    const lowerText = emailText.toLowerCase();
    let toneDescription = "Professional but could be enhanced";
    
    if (lowerText.includes('urgent') || lowerText.includes('need') || lowerText.includes('asap')) {
        toneDescription = "Direct and urgent - may come across as demanding";
    } else if (lowerText.includes('please') && lowerText.includes('thank')) {
        toneDescription = "Polite and professional - well balanced";
    } else if (lowerText.includes('sorry') || lowerText.includes('apologize')) {
        toneDescription = "Apologetic tone - perhaps too deferential";
    } else if (!lowerText.includes('please') && !lowerText.includes('thank')) {
        toneDescription = "Somewhat abrupt - could benefit from more courtesy";
    }
    
    return {
        analysis: `Current tone: ${toneDescription}`,
        suggestions: {
            professional: generateProfessionalVersion(emailText),
            friendly: generateFriendlyVersion(emailText),
            concise: generateConciseVersion(emailText)
        }
    };
}


function generateProfessionalVersion(text) {
    if (text.length < 50) {
        return `Dear [Recipient], I hope this message finds you well. ${text} I would appreciate your assistance with this matter. Thank you for your time and consideration. Best regards.`;
    }
    return `Dear [Recipient], I hope this email finds you well. ${text.slice(0, 100)}... I would be grateful for your prompt attention to this matter. Please let me know if you need any additional information. Thank you for your cooperation. Best regards.`;
}

function generateFriendlyVersion(text) {
    if (text.length < 50) {
        return `Hi there! Hope you're having a great day! ${text} Would you mind helping me out with this? Thanks so much for your time! `;
    }
    return `Hi! I hope you're doing well! ${text.slice(0, 100)}... I'd really appreciate your help with this when you get a chance. Thanks a bunch! `;
}

function generateConciseVersion(text) {
    let conciseText = text.replace(/please|thank you|thanks|hi|hello|dear/gi, '').trim();
    if (conciseText.length > 80) {
        conciseText = conciseText.slice(0, 80) + '...';
    }
    return `${conciseText} Please advise. Thank you.`;
}


function displayResults(results) {
    console.log("Displaying results:", results);
    analysisResults = results;
    
   
    const analysisDiv = document.getElementById('analysis');
    analysisDiv.innerHTML = `
        <div class="current-tone">
            <strong>${results.analysis}</strong>
        </div>
    `;
    
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    
    Object.keys(results.suggestions).forEach(type => {
        const suggestionElement = createSuggestionElement(type, results.suggestions[type]);
        suggestionsDiv.appendChild(suggestionElement);
    });
    
    document.getElementById('results').classList.remove('hidden');
    
    document.getElementById('results').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function createSuggestionElement(type, text) {
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion';
    suggestion.onclick = () => selectSuggestion(text);
    
    const emoji = type === 'professional' ? '' : type === 'friendly'  ;
    
    suggestion.innerHTML = `
        <div class="suggestion-title">${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Version</div>
        <div class="suggestion-text">"${text}"</div>
    `;
    
    return suggestion;
}

function selectSuggestion(suggestionText) {
    console.log("Suggestion selected:", suggestionText);
    
    const editTextarea = document.getElementById('editableEmail');
    editTextarea.value = suggestionText;
    
    document.getElementById('editSection').classList.remove('hidden');

    document.getElementById('editMessages').innerHTML = '';
    
    document.getElementById('editSection').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    setTimeout(() => editTextarea.focus(), 500);
}

async function copyToClipboard() {
    const editableText = document.getElementById('editableEmail').value;
    
    if (!editableText.trim()) {
        showEditMessage('No text to copy! Please select a suggestion first.', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(editableText);
        showEditMessage('Email copied to clipboard!', 'success');
        
        const copyBtn = event.target;
        const originalText = copyBtn.textContent;
        copyBtn.textContent = ' Copied!';
        copyBtn.style.background = '#27ae60';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        try {
            const textArea = document.getElementById('editableEmail');
            textArea.select();
            document.execCommand('copy');
            showEditMessage('Email copied to clipboard!', 'success');
        } catch (fallbackError) {
            showEditMessage('Failed to copy. Please select and copy manually.', 'error');
        }
    }
}

function startOver() {
    console.log("Starting over...");
    
    document.getElementById('emailInput').value = '';
    document.getElementById('editableEmail').value = '';
    
    document.getElementById('results').classList.add('hidden');
    document.getElementById('editSection').classList.add('hidden');
    
    currentEmailText = '';
    analysisResults = null;
    
    clearMessages();
    document.getElementById('editMessages').innerHTML = '';
    
    document.getElementById('emailInput').focus();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoadingState(isLoading) {
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    const button = buttonText.parentElement;
    
    if (isLoading) {
        button.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        button.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

function showMessage(message, type) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `<div class="${type}">${message}</div>`;
    
    if (type === 'success') {
        setTimeout(() => {
            messagesDiv.innerHTML = '';
        }, 3000);
    }
}

function showEditMessage(message, type) {
    const messagesDiv = document.getElementById('editMessages');
    messagesDiv.innerHTML = `<div class="${type}">${message}</div>`;
    
    if (type === 'success') {
        setTimeout(() => {
            messagesDiv.innerHTML = '';
        }, 3000);
    }
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

function showInfo() {
    alert('Email Tone Checker uses AI to analyze your email drafts and suggest improvements for better communication. Simply paste your email, click analyze, and choose from professional, friendly, or concise versions!');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded, Email Tone Checker ready!");
    
    document.getElementById('emailInput').focus();
    
    document.getElementById('emailInput').addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            analyzeEmail();
        }
    });
    
    if (!document.getElementById('emailInput').value) {
        document.getElementById('emailInput').value = 'I need the report by tomorrow. This is urgent.';
    }
});