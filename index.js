const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // يخدم كل الملفات في نفس المجلد

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (err) {
        console.log('خطأ في تحميل البيانات');
    }
    
    return {
        currentQuestion: {
            id: 1,
            text: "ما هي السورة التي فرض فيها الصيام؟",
            answers: ["البقرة", "الماعون", "الأنفال", "المائدة"],
            correct: 1
        },
        archive: [],
        users: []
    };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let quizData = loadData();

// ===== API Routes =====
app.get('/api/current-question', (req, res) => {
    res.json(quizData.currentQuestion);
});

app.post('/api/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    
    let user = quizData.users.find(u => u.email === email);
    if (!user) {
        user = { id: Date.now(), email: email, joinedAt: new Date().toISOString() };
        quizData.users.push(user);
        saveData(quizData);
    }
    
    res.json({ 
        success: true, 
        user: user,
        isAdmin: email === 'admin@ramadan.com'
    });
});

app.post('/api/submit-answer', (req, res) => {
    const { email, answerIndex } = req.body;
    if (!email || answerIndex === undefined) {
        return res.status(400).json({ error: 'البيانات ناقصة' });
    }
    
    if (quizData.archive.length === 0) {
        quizData.archive.push({
            ...quizData.currentQuestion,
            logs: []
        });
    }
    
    const currentSession = quizData.archive[quizData.archive.length - 1];
    const isCorrect = (answerIndex === currentSession.correct);
    
    currentSession.logs.push({
        user: email,
        choiceIndex: answerIndex,
        choiceText: currentSession.answers[answerIndex - 1],
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
    });
    
    saveData(quizData);
    
    res.json({ 
        success: true, 
        isCorrect: isCorrect,
        message: isCorrect ? 'إجابة صحيحة! بارك الله فيك' : 'إجابة خاطئة، حاول مرة أخرى'
    });
});

app.post('/api/add-question', (req, res) => {
    const { text, answers, correct, adminEmail } = req.body;
    
    if (adminEmail !== 'admin@ramadan.com') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    
    const newQuestion = {
        id: Date.now(),
        text: text,
        answers: answers,
        correct: parseInt(correct)
    };
    
    quizData.currentQuestion = newQuestion;
    quizData.archive.push({
        ...newQuestion,
        logs: []
    });
    
    saveData(quizData);
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    const { adminEmail } = req.query;
    if (adminEmail !== 'admin@ramadan.com') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    
    res.json({
        totalUsers: quizData.users.length,
        totalQuestions: quizData.archive.length,
        currentQuestion: quizData.currentQuestion,
        archive: quizData.archive,
        users: quizData.users
    });
});

app.delete('/api/delete-question/:id', (req, res) => {
    const { adminEmail } = req.body;
    const questionId = parseInt(req.params.id);
    
    if (adminEmail !== 'admin@ramadan.com') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    
    quizData.archive = quizData.archive.filter(q => q.id !== questionId);
    saveData(quizData);
    res.json({ success: true });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على: http://localhost:${PORT}`);
});
