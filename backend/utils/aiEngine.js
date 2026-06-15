const natural = require('natural');
const stringSimilarity = require('string-similarity');

const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// ========== F3: Sentiment Analysis ==========
const analyzeSentiment = (text) => {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const score = analyzer.getSentiment(tokens);
    
    // Urgency keywords boost
    const urgentWords = ['emergency', 'urgent', 'danger', 'hazard', 'fire', 'flood', 'broken', 'leak', 'shock', 'electrocution', 'collapsed', 'immediately', 'asap', 'critical'];
    const hasUrgency = urgentWords.some(w => text.toLowerCase().includes(w));
    
    let label;
    if (hasUrgency || score < -0.5) label = 'Urgent';
    else if (score < -0.1) label = 'Negative';
    else if (score > 0.1) label = 'Positive';
    else label = 'Neutral';
    
    return { score: parseFloat(score.toFixed(3)), label };
};

// ========== F1: Duplicate Detection ==========
const checkDuplicate = (newTitle, newDesc, existingComplaints) => {
    if (!existingComplaints || existingComplaints.length === 0) return { isDuplicate: false, matches: [] };
    
    const newText = `${newTitle} ${newDesc}`.toLowerCase();
    const matches = [];
    
    for (const c of existingComplaints) {
        const existingText = `${c.title} ${c.description}`.toLowerCase();
        const similarity = stringSimilarity.compareTwoStrings(newText, existingText);
        
        if (similarity > 0.6) {
            matches.push({
                id: c.id,
                title: c.title,
                similarity: parseFloat((similarity * 100).toFixed(1)),
                status: c.status
            });
        }
    }
    
    matches.sort((a, b) => b.similarity - a.similarity);
    return { isDuplicate: matches.length > 0, matches: matches.slice(0, 3) };
};

// ========== F2: Multi-Factor Priority Prediction ==========
const predictPriority = (category, description, sentimentScore, sentimentLabel) => {
    let score = 0;
    
    // Factor 1: Category weight (0-30)
    const categoryWeights = { 'Electricity': 28, 'Water': 25, 'Internet': 15, 'Hygiene': 18, 'Furniture': 10, 'Other': 12 };
    score += categoryWeights[category] || 12;
    
    // Factor 2: Sentiment urgency (0-30)
    if (sentimentLabel === 'Urgent') score += 30;
    else if (sentimentLabel === 'Negative') score += 20;
    else if (sentimentLabel === 'Neutral') score += 10;
    else score += 5;
    
    // Factor 3: Keyword urgency boost (0-20)
    const desc = description.toLowerCase();
    const criticalKeywords = ['fire', 'flood', 'shock', 'collapse', 'emergency', 'danger', 'hazard'];
    const highKeywords = ['broken', 'leak', 'not working', 'failed', 'down', 'overflow', 'blocked'];
    if (criticalKeywords.some(k => desc.includes(k))) score += 20;
    else if (highKeywords.some(k => desc.includes(k))) score += 12;
    
    // Factor 4: Description length indicates detail/severity (0-10)
    if (description.length > 200) score += 10;
    else if (description.length > 100) score += 6;
    else score += 3;
    
    // Factor 5: Negative sentiment magnitude (0-10)
    score += Math.min(10, Math.abs(sentimentScore) * 10);
    
    // Map score to priority
    let priority;
    if (score >= 60) priority = 'High';
    else if (score >= 35) priority = 'Medium';
    else priority = 'Low';
    
    return { priority, priorityScore: parseFloat(score.toFixed(1)) };
};

// ========== F4: Extractive Summarization ==========
const summarizeText = (text) => {
    const sentences = text.replace(/([.!?])\s+/g, '$1|').split('|').filter(s => s.trim().length > 10);
    if (sentences.length <= 2) return text;
    
    const tfidf = new TfIdf();
    sentences.forEach(s => tfidf.addDocument(s));
    
    // Score each sentence by total TF-IDF weight
    const scored = sentences.map((sentence, i) => {
        let totalScore = 0;
        const words = tokenizer.tokenize(sentence.toLowerCase());
        words.forEach(word => {
            tfidf.tfidfs(word, (docIndex, measure) => {
                if (docIndex === i) totalScore += measure;
            });
        });
        return { sentence: sentence.trim(), score: totalScore, index: i };
    });
    
    scored.sort((a, b) => b.score - a.score);
    const topSentences = scored.slice(0, 2).sort((a, b) => a.index - b.index);
    return topSentences.map(s => s.sentence).join(' ');
};

// ========== F5: Similarity Search ==========
const findSimilar = (targetComplaint, allComplaints, limit = 5) => {
    const targetText = `${targetComplaint.title} ${targetComplaint.description}`.toLowerCase();
    
    const results = allComplaints
        .filter(c => c.id !== targetComplaint.id)
        .map(c => {
            const text = `${c.title} ${c.description}`.toLowerCase();
            const similarity = stringSimilarity.compareTwoStrings(targetText, text);
            return { ...c.toJSON ? c.toJSON() : c, similarity: parseFloat((similarity * 100).toFixed(1)) };
        })
        .filter(c => c.similarity > 30)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    
    return results;
};

module.exports = { analyzeSentiment, checkDuplicate, predictPriority, summarizeText, findSimilar };
