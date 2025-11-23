// 全局变量
let currentModule = 'attendance';
let students = [];
let attendanceRecords = [];
let classes = [];
let currentClass = null;

// 点名状态管理
let rollCallState = {
    isActive: false,
    mode: null, // 'sequential' 或 'random' 或 'question'
    currentStudentIndex: 0,
    calledStudents: [],
    uncalledStudents: [],
    currentStudent: null,
    isCompleted: false,
    allStudents: [] // 保存所有学生的原始列表
};

// 随机提问状态管理
let questionState = {
    isActive: false,
    currentQuestion: '',
    currentStudent: null,
    questionedStudents: [],
    unquestionedStudents: [],
    repeatScored: false,
    answerScored: false,
    allStudents: []
};

// 概率显示控制
let showProbabilityDebug = false;

// 图表实例
let rankingChart = null;

// 分页相关变量
let currentPage = 1;
const itemsPerPage = 10; // 每页显示10个学生

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 从本地存储加载数据
    loadDataFromStorage();
    
    // 绑定事件
    setupEventListeners();
    
    // 初始化显示
    updateAllDisplays();
    
    
    console.log('初始化完成');
});

function initializeApp() {
    // 先加载本地存储的数据
    loadDataFromStorage();
    
    // 重置点名状态，确保每次启动都是干净的状态
    resetRollCallState();
    
    // 初始化班级选择器
    updateClassSelector();
    
    // 确保没有自动选择班级
    currentClass = null;
    
    // 更新管理模块显示为未选择状态
    const currentClassInfo = document.getElementById('current-class-info');
    if (currentClassInfo) {
        currentClassInfo.textContent = '请先选择班级';
    }
    
    // 禁用学生管理按钮
    const addStudentBtn = document.getElementById('add-student');
    const importStudentsBtn = document.getElementById('import-students');
    if (addStudentBtn) addStudentBtn.disabled = true;
    if (importStudentsBtn) importStudentsBtn.disabled = true;
    
    // 初始化显示
    initializeDisplays();
    
    // 显示默认模块
    showModule('attendance');
}

function setupEventListeners() {
    // 导航按钮事件
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const module = this.dataset.module;
            showModule(module);
        });
    });

    // 点名模块事件
    document.getElementById('attendance-class-selector')?.addEventListener('change', selectClassFromAttendance);
    document.getElementById('start-sequential-call')?.addEventListener('click', startSequentialCall);
    document.getElementById('start-random-call')?.addEventListener('click', startRandomCall);
    document.getElementById('start-random-question')?.addEventListener('click', startRandomQuestion);
    document.getElementById('prev-student')?.addEventListener('click', prevStudent);
    document.getElementById('next-student')?.addEventListener('click', nextStudent);
    document.getElementById('cancel-call')?.addEventListener('click', cancelRollCall);
    document.getElementById('back-to-last')?.addEventListener('click', backToLastStudent);
    document.getElementById('confirm-completion')?.addEventListener('click', confirmCompletion);
    
    // 随机提问事件
    document.getElementById('show-repeat-evaluation')?.addEventListener('click', showRepeatEvaluation);
    document.getElementById('back-to-main-evaluation')?.addEventListener('click', backToMainEvaluation);
    document.getElementById('repeat-correct')?.addEventListener('click', () => scoreRepeat(0.5));
    document.getElementById('repeat-incorrect')?.addEventListener('click', () => scoreRepeat(-1));
    document.getElementById('answer-0-5')?.addEventListener('click', () => scoreAnswer(0.5));
    document.getElementById('answer-1')?.addEventListener('click', () => scoreAnswer(1));
    document.getElementById('answer-2')?.addEventListener('click', () => scoreAnswer(2));
    document.getElementById('answer-3')?.addEventListener('click', () => scoreAnswer(3));
    document.getElementById('end-question')?.addEventListener('click', endRandomQuestion);
    document.getElementById('end-question-from-repeat')?.addEventListener('click', endRandomQuestion);
    
    // 出勤状态按钮事件
    document.getElementById('mark-present')?.addEventListener('click', () => markCurrentStudentStatus('present'));
    document.getElementById('mark-late')?.addEventListener('click', () => markCurrentStudentStatus('late'));
    document.getElementById('mark-absent')?.addEventListener('click', () => markCurrentStudentStatus('absent'));

    // 排名模块事件
    document.getElementById('ranking-class-selector')?.addEventListener('change', selectClassFromRanking);
    document.getElementById('toggle-probability-display')?.addEventListener('click', toggleProbabilityDisplay);
    document.getElementById('export-ranking-excel')?.addEventListener('click', exportRankingExcel);

    // 班级模块事件
    document.getElementById('add-class-main')?.addEventListener('click', showAddClassModal);

    // 管理模块事件
    document.getElementById('add-class')?.addEventListener('click', showAddClassModal);
    document.getElementById('class-selector')?.addEventListener('change', selectClass);
    document.getElementById('add-student')?.addEventListener('click', showAddStudentModal);
    document.getElementById('import-students')?.addEventListener('click', importStudents);
    document.getElementById('generate-excel')?.addEventListener('click', generateTestExcel);

    // 模态框事件
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// 初始化显示
function initializeDisplays() {
    updateAllDisplays();
}

// 模块切换
function showModule(moduleName) {
    // 隐藏所有模块
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    // 移除所有导航按钮的激活状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的模块
    document.getElementById(`${moduleName}-module`).classList.add('active');
    document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');
    
    currentModule = moduleName;
    
    // 根据模块更新显示
    switch(moduleName) {
        case 'attendance':
            updateAttendanceDisplay();
            break;
        case 'ranking':
            updateRankingDisplay();
            break;
        case 'classes':
            updateClassesDisplay();
            break;
        case 'management':
            updateManagementDisplay();
            break;
    }
}

// 点名模块功能
function updateAttendanceDisplay() {
    updateAttendanceClassInfo();
    updateAttendanceStats();
    updateRollCallInterface();
}

function updateAttendanceClassInfo() {
    const classInfo = document.getElementById('attendance-class-info');
    if (classInfo) {
        if (currentClass) {
            const studentCount = students.filter(s => s.classId === currentClass.id).length;
            classInfo.textContent = `当前班级: ${currentClass.name} (${studentCount}人)`;
        } else {
            classInfo.textContent = '请先在管理模块中选择班级';
        }
    }
}

function updateRollCallInterface() {
    const mainControls = document.getElementById('main-controls');
    const activeControls = document.getElementById('active-controls');
    const completionControls = document.getElementById('completion-controls');
    const questionControls = document.getElementById('question-controls');
    const calledStudentArea = document.getElementById('called-student-area');
    const prevButton = document.getElementById('prev-student');
    const nextButton = document.getElementById('next-student');
    
    if (questionState.isActive) {
        // 显示随机提问界面
        mainControls.style.display = 'none';
        activeControls.style.display = 'none';
        completionControls.style.display = 'none';
        questionControls.style.display = 'block';
        calledStudentArea.style.display = 'block';
        
        // 显示当前学生（提问模式下隐藏出勤按钮）
        if (questionState.currentStudent) {
            displayCurrentStudentForQuestion(questionState.currentStudent);
        }
        
    } else if (rollCallState.isCompleted) {
        // 显示完成界面
        mainControls.style.display = 'none';
        activeControls.style.display = 'none';
        completionControls.style.display = 'flex';
        questionControls.style.display = 'none';
        calledStudentArea.style.display = 'none';
        
    } else if (rollCallState.isActive) {
        // 显示点名界面
        mainControls.style.display = 'none';
        activeControls.style.display = 'flex';
        completionControls.style.display = 'none';
        questionControls.style.display = 'none';
        calledStudentArea.style.display = 'block';
        
        // 根据模式显示不同按钮
        if (rollCallState.mode === 'sequential') {
            prevButton.style.display = 'inline-flex';
            nextButton.style.display = 'none';
            
            // 如果是第一个学生，禁用上一个按钮
            prevButton.disabled = rollCallState.currentStudentIndex === 0;
            
        } else if (rollCallState.mode === 'random') {
            prevButton.style.display = 'none';
            nextButton.style.display = 'inline-flex';
            
            // 更新随机点名按钮文本
            const nextButtonText = document.getElementById('next-button-text');
            nextButtonText.textContent = '再点一个';
        }
        
        // 显示当前学生
        if (rollCallState.currentStudent) {
            displayCurrentStudent(rollCallState.currentStudent);
        } else {
            // 如果没有当前学生，清除按钮高亮
            clearAttendanceButtonsHighlight();
        }
        
    } else {
        // 显示初始界面
        mainControls.style.display = 'flex';
        activeControls.style.display = 'none';
        completionControls.style.display = 'none';
        questionControls.style.display = 'none';
        calledStudentArea.style.display = 'none';
    }
}

function updateAttendanceStats() {
    // 只统计当前班级的学生
    const currentClassStudents = currentClass ? 
        students.filter(s => s.classId === currentClass.id) : [];
    
    const totalStudents = currentClassStudents.length;
    const calledStudents = currentClassStudents.filter(s => s.status && s.status !== 'unknown').length;
    const presentStudents = currentClassStudents.filter(s => s.status === 'present').length;
    const absentStudents = currentClassStudents.filter(s => s.status === 'absent' || s.status === 'late').length;

    const statCards = document.querySelectorAll('.stat-card .stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = totalStudents;
        statCards[1].textContent = calledStudents;
        statCards[2].textContent = presentStudents;
        statCards[3].textContent = absentStudents;
    }
}

// 新的点名功能函数
function startSequentialCall() {
    if (!currentClass) {
        showNotification('请先在管理模块中选择班级！', 'error');
        return;
    }
    
    const currentClassStudents = students.filter(s => s.classId === currentClass.id);
    
    if (currentClassStudents.length === 0) {
        showNotification('当前班级没有学生数据！', 'error');
        return;
    }
    
    // 重置所有学生状态（启动新点名时）
    resetStudentAttendanceStatus();
    
    // 初始化点名状态
    rollCallState = {
        isActive: true,
        mode: 'sequential',
        currentStudentIndex: 0,
        calledStudents: [],
        uncalledStudents: [...currentClassStudents],
        currentStudent: currentClassStudents[0],
        isCompleted: false,
        allStudents: [...currentClassStudents]
    };
    
    updateAttendanceDisplay();
    
    // 立即保存点名状态
    saveDataToStorage();
    
    showNotification(`开始全部抽点模式！当前班级: ${currentClass.name}`);
}

function startRandomCall() {
    if (!currentClass) {
        showNotification('请先在管理模块中选择班级！', 'error');
        return;
    }
    
    const currentClassStudents = students.filter(s => s.classId === currentClass.id);
    
    if (currentClassStudents.length === 0) {
        showNotification('当前班级没有学生数据！', 'error');
        return;
    }
    
    // 随机点名不重置所有学生状态，保持之前的出勤记录
    
    // 初始化点名状态
    rollCallState = {
        isActive: true,
        mode: 'random',
        currentStudentIndex: 0,
        calledStudents: [],
        uncalledStudents: [...currentClassStudents],
        currentStudent: null,
        isCompleted: false,
        allStudents: [...currentClassStudents]
    };
    
    // 随机选择第一个学生
    selectRandomStudent();
    
    updateAttendanceDisplay();
    
    // 立即保存点名状态
    saveDataToStorage();
    
    showNotification(`开始随机抽点模式！当前班级: ${currentClass.name}`);
}

function nextStudent() {
    if (!rollCallState.isActive || rollCallState.mode !== 'random') return;
    
    // 随机抽点模式：随机选择下一个
    selectRandomStudent();
    updateAttendanceDisplay();
}

function prevStudent() {
    if (!rollCallState.isActive || rollCallState.mode !== 'sequential') return;
    
    if (rollCallState.currentStudentIndex > 0) {
        rollCallState.currentStudentIndex--;
        rollCallState.currentStudent = rollCallState.allStudents[rollCallState.currentStudentIndex];
        updateAttendanceDisplay();
    }
}

function goToNextSequentialStudent() {
    if (rollCallState.mode !== 'sequential') return;
    
    rollCallState.currentStudentIndex++;
    
    if (rollCallState.currentStudentIndex >= rollCallState.allStudents.length) {
        // 所有学生都已点名完毕，显示完成界面
        rollCallState.isCompleted = true;
        rollCallState.currentStudent = null;
        showNotification('所有学生都已点名完毕！');
    } else {
        rollCallState.currentStudent = rollCallState.allStudents[rollCallState.currentStudentIndex];
    }
    
    updateAttendanceDisplay();
}

// 计算学生选中概率的函数（不进行实际选择）
function calculateStudentProbabilities(studentList) {
    if (studentList.length === 0) return [];
    
    // 获取所有学生的积分
    const scores = studentList.map(student => student.score || 0);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // 计算反向权重：积分越高，权重越低
    const weights = scores.map((score, index) => {
        // 使用反向线性映射 + 基础权重，确保高分学生仍有被选中的可能
        const normalizedScore = maxScore === minScore ? 0 : (score - minScore) / (maxScore - minScore);
        const baseWeight = 0.3; // 基础权重，确保高分学生仍有30%的基础概率
        const variableWeight = 0.7 * (1 - normalizedScore); // 可变权重，积分越高权重越低
        let finalWeight = baseWeight + variableWeight;
        
        // 🍀 幸运事件：积分为6的倍数时，权重乘以6
        if (score > 0 && score % 6 === 0) {
            finalWeight *= 6;
        }
        
        return finalWeight;
    });
    
    // 计算总权重和概率
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    return studentList.map((student, index) => ({
        ...student,
        probability: (weights[index] / totalWeight * 100).toFixed(1),
        isLucky: student.score > 0 && student.score % 6 === 0 // 标记幸运学生
    }));
}

// 基于积分的反向加权随机选择算法
function selectWeightedRandomStudent(studentList) {
    if (studentList.length === 0) return null;
    
    // 获取所有学生的积分
    const scores = studentList.map(student => student.score || 0);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // 计算反向权重：积分越高，权重越低
    const weights = scores.map((score, index) => {
        // 使用反向线性映射 + 基础权重，确保高分学生仍有被选中的可能
        const normalizedScore = maxScore === minScore ? 0 : (score - minScore) / (maxScore - minScore);
        const baseWeight = 0.3; // 基础权重，确保高分学生仍有30%的基础概率
        const variableWeight = 0.7 * (1 - normalizedScore); // 可变权重，积分越高权重越低
        let finalWeight = baseWeight + variableWeight;
        
        // 🍀 幸运事件：积分为6的倍数时，权重乘以6
        if (score > 0 && score % 6 === 0) {
            finalWeight *= 6;
            // 在调试模式下显示幸运事件
            if (showProbabilityDebug) {
                console.log(`🍀 幸运事件触发！${studentList[index].name} (积分: ${score}) 权重增加6倍！`);
            }
        }
        
        return finalWeight;
    });
    
    // 计算累积权重
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const cumulativeWeights = [];
    let cumulativeSum = 0;
    
    for (let i = 0; i < weights.length; i++) {
        cumulativeSum += weights[i];
        cumulativeWeights[i] = cumulativeSum;
    }
    
    // 根据开关决定是否显示调试信息
    if (showProbabilityDebug) {
        console.log('=== 加权随机选择概率分析 ===');
        studentList.forEach((student, index) => {
            const probability = (weights[index] / totalWeight * 100).toFixed(1);
            console.log(`${student.name} (积分: ${student.score || 0}) - 选中概率: ${probability}%`);
        });
    }
    
    // 随机选择
    const randomValue = Math.random() * totalWeight;
    
    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (randomValue <= cumulativeWeights[i]) {
            if (showProbabilityDebug) {
                console.log(`选中: ${studentList[i].name}`);
            }
            return studentList[i];
        }
    }
    
    // 备用方案（理论上不应该到达这里）
    return studentList[studentList.length - 1];
}

function selectRandomStudent() {
    if (rollCallState.uncalledStudents.length === 0) {
        showNotification('所有学生都已被点名！');
        return;
    }
    
    // 使用加权随机选择
    rollCallState.currentStudent = selectWeightedRandomStudent(rollCallState.uncalledStudents);
    
    // 只重置当前被抽中学生的出勤状态
    const currentStudent = students.find(s => s.id === rollCallState.currentStudent.id);
    if (currentStudent) {
        currentStudent.status = 'unknown';
    }
}

function displayCurrentStudent(student) {
    const isLucky = student.score > 0 && student.score % 6 === 0;
    
    document.getElementById('called-student-name').textContent = student.name + (isLucky ? ' 🍀' : '');
    document.getElementById('called-student-id').textContent = `学号: ${student.studentId}${isLucky ? ' | 积分: ' + student.score + '分 ✨' : ''}`;
    
    // 如果是幸运学生，显示特殊提示
    if (isLucky) {
        showNotification(`🍀 幸运事件！${student.name} 的积分是6的倍数，被抽中概率增加了6倍！`, 'success');
    }
    
    // 添加动画效果
    const studentCard = document.querySelector('.called-student-card');
    studentCard.classList.remove('highlight');
    setTimeout(() => {
        studentCard.classList.add('highlight');
        if (isLucky) {
            studentCard.style.background = 'linear-gradient(135deg, #ffd700, #ffed4e)';
            studentCard.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.3)';
        }
    }, 100);
    
    // 显示出勤状态按钮（点名模式）
    const attendanceButtons = document.querySelector('.attendance-buttons');
    if (attendanceButtons) {
        attendanceButtons.style.display = 'flex';
    }
    
    // 更新出勤状态按钮的高亮状态
    updateAttendanceButtonsHighlight(student);
}

function updateAttendanceButtonsHighlight(student) {
    const presentBtn = document.getElementById('mark-present');
    const lateBtn = document.getElementById('mark-late');
    const absentBtn = document.getElementById('mark-absent');
    
    // 移除所有高亮状态
    presentBtn.classList.remove('btn-active');
    lateBtn.classList.remove('btn-active');
    absentBtn.classList.remove('btn-active');
    
    // 根据学生当前状态添加高亮
    if (student.status === 'present') {
        presentBtn.classList.add('btn-active');
    } else if (student.status === 'late') {
        lateBtn.classList.add('btn-active');
    } else if (student.status === 'absent') {
        absentBtn.classList.add('btn-active');
    }
}

function clearAttendanceButtonsHighlight() {
    const presentBtn = document.getElementById('mark-present');
    const lateBtn = document.getElementById('mark-late');
    const absentBtn = document.getElementById('mark-absent');
    
    if (presentBtn) presentBtn.classList.remove('btn-active');
    if (lateBtn) lateBtn.classList.remove('btn-active');
    if (absentBtn) absentBtn.classList.remove('btn-active');
}

function markCurrentStudentStatus(status) {
    if (!rollCallState.currentStudent) return;
    
    const student = students.find(s => s.id === rollCallState.currentStudent.id);
    if (student) {
        student.status = status;
        
        // 记录历史出勤记录
        const attendanceRecord = {
            id: Date.now(),
            studentId: student.id,
            classId: student.classId,
            status: status,
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD格式
            timestamp: new Date().toISOString()
        };
        attendanceRecords.push(attendanceRecord);
        
        // 更新学生的出勤统计数据
        student.totalAttendance = (student.totalAttendance || 0) + 1;
        
        if (status === 'present') {
            student.presentCount = (student.presentCount || 0) + 1;
            student.score = (student.score || 0) + 1; // 出席得1分
        } else if (status === 'late') {
            student.lateCount = (student.lateCount || 0) + 1;
            student.score = (student.score || 0) + 1; // 迟到得1分
        } else if (status === 'absent') {
            student.absentCount = (student.absentCount || 0) + 1;
            // 缺席不得分
        }
        
        // 立即更新按钮高亮状态
        updateAttendanceButtonsHighlight(student);
        
        const statusText = {
            'present': '出席',
            'late': '迟到',
            'absent': '缺席'
        };
        
        const scoreText = (status === 'present' || status === 'late') ? ` (+1分，总分: ${student.score})` : 
                         ` (0分，总分: ${student.score})`;
        showNotification(`${student.name} 标记为 ${statusText[status]}${scoreText}`);
        
        updateAttendanceStats();
        
        // 立即保存数据，确保点名结果不丢失
        const saveSuccess = saveDataToStorage();
        if (!saveSuccess) {
            showNotification('数据保存失败，请检查浏览器存储空间！', 'error');
        }
        
        // 立即跳转，无延迟
        if (rollCallState.mode === 'sequential') {
            goToNextSequentialStudent();
        } else if (rollCallState.mode === 'random') {
            // 将学生从未点名列表移到已点名列表
            rollCallState.calledStudents.push(rollCallState.currentStudent);
            rollCallState.uncalledStudents = rollCallState.uncalledStudents.filter(s => s.id !== rollCallState.currentStudent.id);
            
            // 随机模式等待用户点击"再点一个"
            rollCallState.currentStudent = null;
            updateRollCallInterface();
        }
    }
}

function backToLastStudent() {
    if (!rollCallState.isCompleted) return;
    
    // 回到最后一个学生
    rollCallState.isCompleted = false;
    rollCallState.currentStudentIndex = rollCallState.allStudents.length - 1;
    rollCallState.currentStudent = rollCallState.allStudents[rollCallState.currentStudentIndex];
    
    updateAttendanceDisplay();
    showNotification('返回到最后一个学生');
}

function confirmCompletion() {
    // 确认完成点名，但保留学生的出勤状态
    rollCallState = {
        isActive: false,
        mode: null,
        currentStudentIndex: 0,
        calledStudents: [],
        uncalledStudents: [],
        currentStudent: null,
        isCompleted: false,
        allStudents: []
    };
    
    // 同时重置随机提问状态
    questionState = {
        isActive: false,
        currentQuestion: '',
        currentStudent: null,
        questionedStudents: [],
        unquestionedStudents: [],
        repeatScored: false,
        answerScored: false,
        allStudents: []
    };
    
    // 注意：不重置学生的出勤状态，保留上次点名结果
    updateAttendanceDisplay();
    saveDataToStorage();
    showNotification('点名已完成！');
}

function cancelRollCall() {
    resetRollCallState();
    updateAttendanceDisplay();
    
    // 保存取消状态
    saveDataToStorage();
    
    showNotification('点名已取消');
}

// 重置点名状态的公共函数
function resetRollCallState() {
    rollCallState = {
        isActive: false,
        mode: null,
        currentStudentIndex: 0,
        calledStudents: [],
        uncalledStudents: [],
        currentStudent: null,
        isCompleted: false,
        allStudents: []
    };
    
    // 重置学生卡片样式
    const studentCard = document.querySelector('.called-student-card');
    if (studentCard) {
        studentCard.style.background = '';
        studentCard.style.boxShadow = '';
    }
    
    // 同时重置随机提问状态
    questionState = {
        isActive: false,
        currentQuestion: '',
        currentStudent: null,
        questionedStudents: [],
        unquestionedStudents: [],
        repeatScored: false,
        answerScored: false,
        allStudents: []
    };
}

// 重置学生出勤状态（仅在启动新点名时调用）
function resetStudentAttendanceStatus() {
    students.forEach(student => {
        student.status = 'unknown';
    });
}

// 班级模块功能
function updateClassesDisplay() {
    updateClassesGrid();
}

function updateClassesGrid() {
    const grid = document.getElementById('classes-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    classes.forEach(cls => {
        const studentCount = students.filter(s => s.classId === cls.id).length;
        
        const classCard = document.createElement('div');
        classCard.className = 'class-card';
        classCard.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        `;
        
        classCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: #2d3748;">${cls.name}</h3>
                    <p style="margin: 0 0 8px 0; color: #666;">${cls.description || '暂无描述'}</p>
                    <span style="color: #667eea; font-weight: 600;">学生数: ${studentCount}</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="editClass(${cls.id})" title="编辑班级">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="deleteClass(${cls.id})" title="删除班级">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        classCard.addEventListener('mouseenter', () => {
            classCard.style.transform = 'translateY(-2px)';
            classCard.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        classCard.addEventListener('mouseleave', () => {
            classCard.style.transform = 'translateY(0)';
            classCard.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        });
        
        grid.appendChild(classCard);
    });
    
    if (classes.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">暂无班级，点击"添加班级"开始创建</p>';
    }
}

// 排名模块功能
function updateRankingDisplay() {
    updateRankingTable();
    updateRankingChart();
}


function updateRankingTable() {
    const tbody = document.getElementById('ranking-tbody');
    const paginationContainer = document.getElementById('pagination-container');
    if (!tbody) return;
    
    const selectedClassId = document.getElementById('ranking-class-selector')?.value;
    
    if (!selectedClassId) {
        const colSpan = showProbabilityDebug ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #666;">请选择班级查看排名</td></tr>`;
        paginationContainer.style.display = 'none';
        return;
    }
    
    const classStudents = students.filter(s => s.classId == selectedClassId);
    
    if (classStudents.length === 0) {
        const colSpan = showProbabilityDebug ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #666;">该班级暂无学生</td></tr>`;
        paginationContainer.style.display = 'none';
        return;
    }
    
    // 计算每个学生的统计数据
    const studentStats = classStudents.map(student => {
        // 使用学生对象中存储的统计数据，如果没有则从历史记录计算
        let presentCount = student.presentCount || 0;
        let lateCount = student.lateCount || 0;
        let absentCount = student.absentCount || 0;
        let totalCalls = student.totalAttendance || 0;
        
        // 如果学生对象中没有统计数据，从历史记录中计算
        if (totalCalls === 0) {
            const studentRecords = attendanceRecords.filter(record => record.studentId === student.id);
            presentCount = studentRecords.filter(record => record.status === 'present').length;
            lateCount = studentRecords.filter(record => record.status === 'late').length;
            absentCount = studentRecords.filter(record => record.status === 'absent').length;
            totalCalls = presentCount + lateCount + absentCount;
        }
        
        // 出勤率计算：（出席次数+迟到次数）/总点名次数
        const attendanceRate = totalCalls > 0 ? Math.round(((presentCount + lateCount) / totalCalls) * 100) : 0;
        
        return {
            ...student,
            totalCalls,
            presentCount,
            lateCount,
            absentCount,
            attendanceRate
        };
    });
    
    // 主要按积分排序，积分相同则按出勤率排序，出勤率相同则按出席次数排序
    studentStats.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score; // 积分高的在前
        }
        if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate; // 出勤率高的在前
        }
        return b.presentCount - a.presentCount; // 出席次数多的在前
    });
    
    // 计算选中概率
    const studentsWithProbability = calculateStudentProbabilities(studentStats);
    
    // 分页逻辑
    const totalStudents = studentsWithProbability.length;
    const totalPages = Math.ceil(totalStudents / itemsPerPage);
    
    // 确保当前页在有效范围内
    if (currentPage > totalPages) {
        currentPage = Math.max(1, totalPages);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalStudents);
    const currentPageStudents = studentsWithProbability.slice(startIndex, endIndex);
    
    // 生成表格行
    tbody.innerHTML = '';
    currentPageStudents.forEach((student, pageIndex) => {
        const globalIndex = startIndex + pageIndex; // 全局排名索引
        const row = document.createElement('tr');
        const statusText = student.status === 'present' ? '出席' : 
                          student.status === 'late' ? '迟到' : 
                          student.status === 'absent' ? '缺席' : '未点名';
        const statusColor = student.status === 'present' ? '#48bb78' : 
                           student.status === 'late' ? '#ed8936' : 
                           student.status === 'absent' ? '#e53e3e' : '#666';
        
        const probabilityColor = parseFloat(student.probability) >= 25 ? '#e53e3e' : 
                                 parseFloat(student.probability) >= 20 ? '#ed8936' : '#48bb78';
        
        row.innerHTML = `
            <td style="font-weight: 600; color: ${globalIndex < 3 ? '#667eea' : '#333'}">${globalIndex + 1}</td>
            <td>${student.name}${student.isLucky ? ' <span style="color: #ffd700; font-size: 1.2em;" title="幸运学生：积分为6的倍数，被抽中概率增加6倍！">🍀</span>' : ''}</td>
            <td>${student.studentId}</td>
            <td style="color: #667eea; font-weight: 600; font-size: 1.1rem;">${student.score || 0}分${student.isLucky ? ' <span style="color: #ffd700; font-size: 0.8em;">✨</span>' : ''}</td>
            <td>
                <span style="color: ${statusColor}; font-weight: 600;">
                    ${statusText}
                </span>
            </td>
            <td>
                <span style="color: ${student.attendanceRate >= 80 ? '#48bb78' : student.attendanceRate >= 60 ? '#ed8936' : '#e53e3e'}; font-weight: 600;">
                    ${student.attendanceRate}%
                </span>
            </td>
            <td class="probability-cell" style="display: ${showProbabilityDebug ? '' : 'none'};">
                <span style="color: ${probabilityColor}; font-weight: 600;">
                    ${student.probability}%
                </span>
            </td>
        `;
        
        // 为前三名添加特殊样式
        if (globalIndex < 3) {
            row.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
        }
        
        tbody.appendChild(row);
    });
    
    // 更新分页控件
    updatePaginationControls(totalStudents, totalPages);
}

// 分页控制函数
function updatePaginationControls(totalStudents, totalPages) {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info-text');
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (totalStudents <= itemsPerPage) {
        // 如果学生数量不超过每页显示数量，隐藏分页控件
        paginationContainer.style.display = 'none';
        return;
    }
    
    // 显示分页控件
    paginationContainer.style.display = 'block';
    
    // 更新分页信息
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalStudents);
    paginationInfo.textContent = `显示第 ${startIndex}-${endIndex} 条，共 ${totalStudents} 条记录`;
    
    // 更新上一页/下一页按钮状态
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // 生成页码按钮
    generatePageNumbers(totalPages);
}

function generatePageNumbers(totalPages) {
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const maxVisiblePages = 5; // 最多显示5个页码
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 如果起始页大于1，显示第一页和省略号
    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    // 显示页码范围
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }
    
    // 如果结束页小于总页数，显示省略号和最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageButton(totalPages);
    }
}

function addPageButton(pageNum) {
    const pageNumbers = document.getElementById('page-numbers');
    const button = document.createElement('button');
    button.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    pageNumbers.appendChild(button);
}

function addEllipsis() {
    const pageNumbers = document.getElementById('page-numbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    pageNumbers.appendChild(ellipsis);
}

function changePage(direction) {
    const newPage = currentPage + direction;
    const selectedClassId = document.getElementById('ranking-class-selector')?.value;
    
    if (!selectedClassId) return;
    
    const classStudents = students.filter(s => s.classId == selectedClassId);
    const totalPages = Math.ceil(classStudents.length / itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateRankingTable();
    }
}

function goToPage(pageNum) {
    currentPage = pageNum;
    updateRankingTable();
}

// 重置分页到第一页（当切换班级时调用）
function resetPagination() {
    currentPage = 1;
}

function updateRankingChart() {
    const chartCanvas = document.getElementById('ranking-chart-canvas');
    if (!chartCanvas) return;
    
    const selectedClassId = document.getElementById('ranking-class-selector')?.value;
    
    // 如果没有选择班级，显示提示信息
    if (!selectedClassId) {
        if (rankingChart) {
            rankingChart.destroy();
            rankingChart = null;
        }
        
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('请选择班级查看排名图表', chartCanvas.width / 2, chartCanvas.height / 2);
        return;
    }
    
    const classStudents = students.filter(s => s.classId == selectedClassId);
    
    if (classStudents.length === 0) {
        if (rankingChart) {
            rankingChart.destroy();
            rankingChart = null;
        }
        
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('该班级暂无学生数据', chartCanvas.width / 2, chartCanvas.height / 2);
        return;
    }
    
    // 计算学生统计数据并排序
    const studentStats = classStudents.map(student => {
        let presentCount = student.presentCount || 0;
        let lateCount = student.lateCount || 0;
        let absentCount = student.absentCount || 0;
        let totalCalls = student.totalAttendance || 0;
        
        if (totalCalls === 0) {
            const studentRecords = attendanceRecords.filter(record => record.studentId === student.id);
            presentCount = studentRecords.filter(record => record.status === 'present').length;
            lateCount = studentRecords.filter(record => record.status === 'late').length;
            absentCount = studentRecords.filter(record => record.status === 'absent').length;
            totalCalls = presentCount + lateCount + absentCount;
        }
        
        const attendanceRate = totalCalls > 0 ? Math.round(((presentCount + lateCount) / totalCalls) * 100) : 0;
        
        return {
            ...student,
            totalCalls,
            presentCount,
            lateCount,
            absentCount,
            attendanceRate
        };
    });
    
    // 按积分排序
    studentStats.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate;
        }
        return b.presentCount - a.presentCount;
    });
    
    // 限制最多显示50个学生
    const displayStudents = studentStats.slice(0, 50);
    
    // 准备图表数据
    const labels = displayStudents.map((student, index) => `${index + 1}. ${student.name}`);
    const scores = displayStudents.map(student => student.score || 0);
    
    // 生成颜色数组
    const backgroundColors = displayStudents.map((student, index) => {
        if (index === 0) return 'rgba(255, 215, 0, 0.8)'; // 金色 - 第一名
        if (index === 1) return 'rgba(192, 192, 192, 0.8)'; // 银色 - 第二名
        if (index === 2) return 'rgba(205, 127, 50, 0.8)'; // 铜色 - 第三名
        return 'rgba(102, 126, 234, 0.6)'; // 默认蓝色
    });
    
    const borderColors = displayStudents.map((student, index) => {
        if (index === 0) return 'rgba(255, 215, 0, 1)';
        if (index === 1) return 'rgba(192, 192, 192, 1)';
        if (index === 2) return 'rgba(205, 127, 50, 1)';
        return 'rgba(102, 126, 234, 1)';
    });
    
    // 销毁现有图表
    if (rankingChart) {
        rankingChart.destroy();
    }
    
    // 创建新图表
    const ctx = chartCanvas.getContext('2d');
    rankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '积分',
                data: scores,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            return `排名第${index + 1}名`;
                        },
                        label: function(context) {
                            const index = context.dataIndex;
                            const student = displayStudents[index];
                            return [
                                `姓名: ${student.name}`,
                                `学号: ${student.studentId}`,
                                `积分: ${student.score || 0}分`,
                                `出勤率: ${student.attendanceRate}%`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#667eea',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '积分',
                        color: '#2d3748',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '学生排名',
                        color: '#2d3748',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function calculateAttendanceRate(studentId) {
    // 从历史出勤记录中计算该学生的出勤率
    const studentRecords = attendanceRecords.filter(record => record.studentId === studentId);
    
    const presentCount = studentRecords.filter(record => record.status === 'present').length;
    const lateCount = studentRecords.filter(record => record.status === 'late').length;
    const absentCount = studentRecords.filter(record => record.status === 'absent').length;
    const totalCalls = presentCount + lateCount + absentCount;
    
    // 出勤率计算公式：（出席次数+迟到次数）/（出席次数+迟到次数+缺席次数）
    return totalCalls > 0 ? Math.round(((presentCount + lateCount) / totalCalls) * 100) : 0;
}



// 班级管理功能
function showAddClassModal() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>添加新班级</h3>
        <form id="add-class-form">
            <div class="form-group">
                <label>班级名称</label>
                <input type="text" class="form-input" id="class-name" required>
            </div>
            <div class="form-group">
                <label>班级描述</label>
                <input type="text" class="form-input" id="class-description">
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">添加班级</button>
            </div>
        </form>
    `;
    
    document.getElementById('add-class-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addClass();
    });
    
    showModal();
}

function addClass() {
    const name = document.getElementById('class-name').value;
    const description = document.getElementById('class-description').value;
    
    const newClass = {
        id: Date.now(),
        name,
        description
    };
    
    classes.push(newClass);
    updateClassSelector();
    updateClassManagementList();
    saveDataToStorage();
    closeModal();
    
    showNotification('班级添加成功！');
}

// 统一的班级选择处理函数
function handleClassSelection(selectorId) {
    const selector = document.getElementById(selectorId);
    if (!selector) {
        console.error('Selector not found:', selectorId);
        return;
    }
    
    console.log('handleClassSelection - selector value:', selector.value);
    const classId = selector.value ? parseInt(selector.value) : null;
    console.log('handleClassSelection - parsed classId:', classId);
    updateCurrentClass(classId);
}

function selectClass() {
    handleClassSelection('class-selector');
    
    // 额外确保管理模块的界面更新
    updateStudentManagementList();
}

function selectClassFromAttendance() {
    handleClassSelection('attendance-class-selector');
}

function selectClassFromRanking() {
    resetPagination(); // 重置分页到第一页
    handleClassSelection('ranking-class-selector');
}

function toggleProbabilityDisplay() {
    showProbabilityDebug = !showProbabilityDebug;
    
    const button = document.getElementById('toggle-probability-display');
    const probabilityColumn = document.getElementById('probability-column');
    const probabilityCells = document.querySelectorAll('.probability-cell');
    
    if (showProbabilityDebug) {
        button.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏概率';
        button.classList.remove('btn-secondary');
        button.classList.add('btn-success');
        
        // 显示概率列标题
        if (probabilityColumn) {
            probabilityColumn.style.display = '';
        }
        
        // 显示所有概率单元格
        probabilityCells.forEach(cell => {
            cell.style.display = '';
        });
        
        showNotification('概率显示已开启');
        console.log('📊 概率显示已开启 - 随机选择时将显示每个学生的被选中概率');
    } else {
        button.innerHTML = '<i class="fas fa-eye"></i> 显示概率';
        button.classList.remove('btn-success');
        button.classList.add('btn-secondary');
        
        // 隐藏概率列标题
        if (probabilityColumn) {
            probabilityColumn.style.display = 'none';
        }
        
        // 隐藏所有概率单元格
        probabilityCells.forEach(cell => {
            cell.style.display = 'none';
        });
        
        showNotification('概率显示已关闭');
        console.log('📊 概率显示已关闭');
    }
    
    // 更新排名表格以反映概率列的变化
    updateRankingTable();
}

function updateCurrentClass(classId) {
    console.log('updateCurrentClass called with classId:', classId);
    console.log('Available classes:', classes);
    
    if (classId) {
        currentClass = classes.find(c => c.id === parseInt(classId));
        console.log('Found currentClass:', currentClass);
        
        if (currentClass) {
            // 更新管理模块的显示
            const currentClassInfo = document.getElementById('current-class-info');
            if (currentClassInfo) {
                currentClassInfo.textContent = `当前班级: ${currentClass.name}`;
            }
            
            // 启用学生管理按钮
            const addStudentBtn = document.getElementById('add-student');
            const importStudentsBtn = document.getElementById('import-students');
            if (addStudentBtn) addStudentBtn.disabled = false;
            if (importStudentsBtn) importStudentsBtn.disabled = false;
        } else {
            console.error('Class not found for id:', classId);
            currentClass = null;
        }
        
    } else {
        currentClass = null;
        
        // 更新管理模块的显示
        const currentClassInfo = document.getElementById('current-class-info');
        if (currentClassInfo) {
            currentClassInfo.textContent = '请先选择班级';
        }
        
        // 禁用学生管理按钮
        const addStudentBtn = document.getElementById('add-student');
        const importStudentsBtn = document.getElementById('import-students');
        if (addStudentBtn) addStudentBtn.disabled = true;
        if (importStudentsBtn) importStudentsBtn.disabled = true;
    }
    
    // 同步两个班级选择器
    syncClassSelectors(classId);
    
    // 更新相关显示
    updateStudentManagementList();
    updateAttendanceDisplay();
    updateRankingDisplay();
    saveDataToStorage();
}

function syncClassSelectors(selectedClassId) {
    const managementSelector = document.getElementById('class-selector');
    const attendanceSelector = document.getElementById('attendance-class-selector');
    const rankingSelector = document.getElementById('ranking-class-selector');
    
    const value = selectedClassId ? selectedClassId.toString() : '';
    
    if (managementSelector && managementSelector.value !== value) {
        managementSelector.value = value;
    }
    
    if (attendanceSelector && attendanceSelector.value !== value) {
        attendanceSelector.value = value;
    }
    
    if (rankingSelector && rankingSelector.value !== value) {
        rankingSelector.value = value;
    }
}

function updateClassSelector() {
    const managementSelector = document.getElementById('class-selector');
    const attendanceSelector = document.getElementById('attendance-class-selector');
    const rankingSelector = document.getElementById('ranking-class-selector');
    
    // 每次启动时不自动选择班级
    const currentValue = '';
    
    // 更新管理模块的班级选择器
    if (managementSelector) {
        managementSelector.innerHTML = '<option value="">选择班级</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            managementSelector.appendChild(option);
        });
        managementSelector.value = currentValue;
    }
    
    // 更新点名模块的班级选择器
    if (attendanceSelector) {
        attendanceSelector.innerHTML = '<option value="">选择班级</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            attendanceSelector.appendChild(option);
        });
        attendanceSelector.value = currentValue;
    }
    
    // 更新排名模块的班级选择器
    if (rankingSelector) {
        rankingSelector.innerHTML = '<option value="">选择班级</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            rankingSelector.appendChild(option);
        });
        rankingSelector.value = currentValue;
    }
}

function updateClassManagementList() {
    const list = document.getElementById('class-management-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    classes.forEach(cls => {
        const item = document.createElement('div');
        item.className = 'class-management-item';
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        `;
        
        const studentCount = students.filter(s => s.classId === cls.id).length;
        
        item.innerHTML = `
            <div>
                <strong>${cls.name}</strong>
                <span style="color: #666; margin-left: 15px;">${cls.description}</span>
                <span style="color: #667eea; margin-left: 15px;">学生数: ${studentCount}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="editClass(${cls.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-secondary" onclick="deleteClass(${cls.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        list.appendChild(item);
    });
}

function editClass(classId) {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>编辑班级</h3>
        <form id="edit-class-form">
            <div class="form-group">
                <label>班级名称</label>
                <input type="text" class="form-input" id="edit-class-name" value="${cls.name}" required>
            </div>
            <div class="form-group">
                <label>班级描述</label>
                <input type="text" class="form-input" id="edit-class-description" value="${cls.description || ''}">
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存修改</button>
            </div>
        </form>
    `;
    
    document.getElementById('edit-class-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateClass(classId);
    });
    
    showModal();
}

function updateClass(classId) {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    
    cls.name = document.getElementById('edit-class-name').value;
    cls.description = document.getElementById('edit-class-description').value;
    
    updateClassSelector();
    updateClassManagementList();
    saveDataToStorage();
    closeModal();
    
    showNotification('班级修改成功！');
}

function deleteClass(classId) {
    const classToDelete = classes.find(c => c.id === classId);
    const classStudents = students.filter(s => s.classId === classId);
    const studentCount = classStudents.length;
    
    if (!classToDelete) {
        showNotification('班级不存在！', 'error');
        return;
    }
    
    // 第一次确认：询问是否删除班级
    let confirmMessage = `确定要删除班级 "${classToDelete.name}" 吗？`;
    if (studentCount > 0) {
        confirmMessage += `\n\n注意：该班级有 ${studentCount} 名学生，删除班级将同时删除所有学生数据！`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 如果有学生，进行二次确认
    if (studentCount > 0) {
        const studentNames = classStudents.map(s => s.name).join('、');
        const secondConfirmMessage = `⚠️ 最终确认 ⚠️\n\n即将删除班级 "${classToDelete.name}" 及以下 ${studentCount} 名学生：\n\n${studentNames}\n\n此操作将同时删除：\n• 所有学生的基本信息\n• 所有学生的积分和出勤记录\n• 该班级的历史出勤数据\n\n此操作不可撤销！确定要继续吗？`;
        
        if (!confirm(secondConfirmMessage)) {
            showNotification('删除操作已取消');
            return;
        }
    }
    
    // 执行删除操作
    try {
        // 删除班级中的所有学生
        if (studentCount > 0) {
            students = students.filter(s => s.classId !== classId);
            
            // 删除该班级的所有出勤记录
            attendanceRecords = attendanceRecords.filter(record => record.classId !== classId);
        }
        
        // 删除班级
        classes = classes.filter(c => c.id !== classId);
        
        // 如果删除的是当前选中的班级，重置选择
        if (currentClass && currentClass.id === classId) {
            updateCurrentClass(null);
        }
        
        // 重置点名状态
        resetRollCallState();
        
        // 更新显示和保存数据
        updateClassSelector();
        updateClassManagementList();
        updateAllDisplays();
        saveDataToStorage();
        
        if (studentCount > 0) {
            showNotification(`班级 "${classToDelete.name}" 及其 ${studentCount} 名学生已删除！`);
        } else {
            showNotification(`班级 "${classToDelete.name}" 删除成功！`);
        }
        
    } catch (error) {
        console.error('删除班级时出错:', error);
        showNotification('删除班级时发生错误！', 'error');
    }
}

// 管理模块功能
function updateManagementDisplay() {
    updateClassSelector();
    updateClassManagementList();
    updateStudentManagementList();
    updateOverviewStats();
}

function updateStudentManagementList() {
    const list = document.getElementById('student-management-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    // 只显示当前班级的学生
    const currentClassStudents = currentClass ? 
        students.filter(s => s.classId === currentClass.id) : [];
    
    if (currentClassStudents.length === 0) {
        if (currentClass) {
            list.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">该班级暂无学生</p>';
        } else {
            list.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">请先选择班级</p>';
        }
        return;
    }
    
    currentClassStudents.forEach(student => {
        const item = document.createElement('div');
        item.className = 'student-management-item';
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        `;
        
        item.innerHTML = `
            <div>
                <strong>${student.name}</strong>
                <span style="color: #666; margin-left: 15px;">学号: ${student.studentId}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="editStudent(${student.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-secondary" onclick="deleteStudent(${student.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        list.appendChild(item);
    });
}

function updateOverviewStats() {
    const overviewCards = document.querySelectorAll('.overview-card .overview-number');
    if (overviewCards.length >= 3) {
        overviewCards[0].textContent = classes.length;
        overviewCards[1].textContent = students.length;
        overviewCards[2].textContent = attendanceRecords.length;
    }
}

function showAddStudentModal() {
    if (!currentClass) {
        showNotification('请先选择班级！', 'error');
        return;
    }
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>添加新学生到 ${currentClass.name}</h3>
        <form id="add-student-form">
            <div class="form-group">
                <label>学生姓名</label>
                <input type="text" class="form-input" id="student-name" required>
            </div>
            <div class="form-group">
                <label>学号</label>
                <input type="text" class="form-input" id="student-id" required>
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">添加学生</button>
            </div>
        </form>
    `;
    
    document.getElementById('add-student-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addStudent();
    });
    
    showModal();
}

function addStudent() {
    const name = document.getElementById('student-name').value;
    const studentId = document.getElementById('student-id').value;
    
    // 检查学号是否已存在
    const existingStudent = students.find(s => s.studentId === studentId);
    if (existingStudent) {
        showNotification('该学号已存在！', 'error');
        return;
    }
    
    const newStudent = {
        id: Date.now(),
        name,
        studentId,
        classId: currentClass.id,
        status: 'unknown',
        score: 0,
        totalAttendance: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0
    };
    
    students.push(newStudent);
    updateAllDisplays();
    
    // 立即保存新学生数据
    saveDataToStorage();
    
    closeModal();
    showNotification('学生添加成功！');
}

function editStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const studentClass = classes.find(c => c.id === student.classId);
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>编辑学生信息</h3>
        <form id="edit-student-form">
            <div class="form-group">
                <label>学生姓名</label>
                <input type="text" class="form-input" id="edit-student-name" value="${student.name}" required>
            </div>
            <div class="form-group">
                <label>学号</label>
                <input type="text" class="form-input" id="edit-student-id" value="${student.studentId}" required>
            </div>
            <div class="form-group">
                <label>所属班级</label>
                <select class="form-select" id="edit-student-class" required>
                    ${classes.map(cls => 
                        `<option value="${cls.id}" ${cls.id === student.classId ? 'selected' : ''}>${cls.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存修改</button>
            </div>
        </form>
    `;
    
    document.getElementById('edit-student-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateStudent(studentId);
    });
    
    showModal();
}

function updateStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const newStudentId = document.getElementById('edit-student-id').value;
    
    // 检查学号是否已被其他学生使用
    const existingStudent = students.find(s => s.studentId === newStudentId && s.id !== studentId);
    if (existingStudent) {
        showNotification('该学号已被其他学生使用！', 'error');
        return;
    }
    
    student.name = document.getElementById('edit-student-name').value;
    student.studentId = newStudentId;
    student.classId = parseInt(document.getElementById('edit-student-class').value);
    
    updateAllDisplays();
    
    // 立即保存修改后的学生数据
    saveDataToStorage();
    
    closeModal();
    showNotification('学生信息修改成功！');
}

function deleteStudent(studentId) {
    if (confirm('确定要删除这个学生吗？')) {
        students = students.filter(s => s.id !== studentId);
        updateAllDisplays();
        
        // 立即保存删除操作
        saveDataToStorage();
        
        showNotification('学生删除成功！');
    }
}

function importStudents() {
    try {
        // 检查是否选择了班级
        if (!currentClass) {
            showNotification('请先在管理模块中选择班级！', 'error');
            return;
        }

        // 检查XLSX库是否加载
        if (typeof XLSX === 'undefined') {
            showNotification('Excel处理库未加载，请刷新页面重试！', 'error');
            return;
        }
        
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt,.xlsx,.xls';
        input.style.display = 'none';
        
        // 添加到页面中（某些浏览器需要这样做）
        document.body.appendChild(input);
        
        input.onchange = function(e) {
            try {
                const file = e.target.files[0];
                if (!file) {
                    return;
                }
                
                const fileName = file.name.toLowerCase();
                
                if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    // Excel文件处理
                    const reader = new FileReader();
                    
                    reader.onerror = function() {
                        showNotification('文件读取失败，请检查文件是否损坏！', 'error');
                    };
                    
                    reader.onload = function(e) {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            parseExcelData(workbook);
                        } catch (error) {
                            showNotification('Excel文件解析失败：' + error.message, 'error');
                        }
                    };
                    
                    reader.readAsArrayBuffer(file);
                } else {
                    // CSV/TXT文件处理
                    const reader = new FileReader();
                    
                    reader.onerror = function() {
                        showNotification('文件读取失败，请检查文件是否损坏！', 'error');
                    };
                    
                    reader.onload = function(e) {
                        try {
                            const content = e.target.result;
                            parseStudentData(content);
                        } catch (error) {
                            showNotification('文件解析失败：' + error.message, 'error');
                        }
                    };
                    
                    reader.readAsText(file, 'UTF-8');
                }
            } catch (error) {
                showNotification('文件处理失败：' + error.message, 'error');
            }
            // 处理完成后清理
            setTimeout(() => {
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            }, 1000);
        };
        
        // 添加取消事件处理
        input.oncancel = function() {
            setTimeout(() => {
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            }, 100);
        };
        
        // 使用setTimeout确保元素已添加到DOM
        setTimeout(() => {
            input.click();
        }, 100);
        
    } catch (error) {
        showNotification('导入功能初始化失败：' + error.message, 'error');
    }
}

function parseExcelData(workbook) {
    if (!currentClass) {
        showNotification('请先选择班级！', 'error');
        return;
    }
    
    try {
        // 检查工作簿是否有工作表
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            showNotification('Excel文件中没有找到工作表！', 'error');
            return;
        }
        
        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            showNotification('无法读取工作表数据！', 'error');
            return;
        }
        
        // 将工作表转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            showNotification('Excel文件中没有数据！', 'error');
            return;
        }
        
        let importedCount = 0;
        let startRow = 0;
        
        // 检查是否有标题行
        if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            if (firstRow.some(cell => 
                typeof cell === 'string' && 
                (cell.includes('姓名') || cell.includes('学号') || 
                 cell.includes('name') || cell.includes('id'))
            )) {
                startRow = 1; // 跳过标题行
            }
        }
        
        // 处理数据行
        for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 2 && row[0] && row[1]) {
                const studentId = String(row[1]).trim();
                
                // 检查是否已存在相同学号的学生
                const existingStudent = students.find(s => s.studentId === studentId);
                if (!existingStudent) {
                    const newStudent = {
                        id: Date.now() + Math.random(),
                        name: String(row[0]).trim(),
                        studentId: studentId,
                        classId: currentClass.id,
                        status: 'unknown',
                        score: 0,
                        totalAttendance: 0,
                        presentCount: 0,
                        lateCount: 0,
                        absentCount: 0
                    };
                    
                    students.push(newStudent);
                    importedCount++;
                }
            }
        }
        
        if (importedCount > 0) {
            updateAllDisplays();
            saveDataToStorage();
            showNotification(`成功从Excel导入 ${importedCount} 个学生到 ${currentClass.name}！`);
        } else {
            showNotification('Excel文件中没有找到有效的学生数据或学号已存在！', 'error');
        }
        
    } catch (error) {
        console.error('Excel解析错误:', error);
        showNotification('Excel文件解析失败，请检查文件格式！', 'error');
    }
}

function parseStudentData(content) {
    const lines = content.split('\n');
    let importedCount = 0;
    
    lines.forEach(line => {
        const parts = line.trim().split(',');
        if (parts.length >= 3) {
            const newStudent = {
                id: Date.now() + Math.random(),
                name: parts[0].trim(),
                studentId: parts[1].trim(),
                class: parts[2].trim(),
                status: 'unknown'
            };
            students.push(newStudent);
            importedCount++;
        }
    });
    
    if (importedCount > 0) {
        updateAllDisplays();
        saveDataToStorage();
        showNotification(`成功导入 ${importedCount} 个学生！`);
    } else {
        showNotification('导入失败，请检查文件格式！', 'error');
    }
}

// 通用功能
function showModal() {
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'error' ? '#e53e3e' : type === 'info' ? '#3182ce' : '#48bb78'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateAllDisplays() {
    updateAttendanceDisplay();
    updateRankingDisplay();
    updateClassesDisplay();
    updateManagementDisplay();
}

// 数据持久化
function saveDataToStorage() {
    try {
        // 创建一个干净的点名状态用于保存（不保存临时的点名进行状态）
        const cleanRollCallState = {
            isActive: false,
            mode: null,
            currentStudentIndex: 0,
            calledStudents: [],
            uncalledStudents: [],
            currentStudent: null,
            isCompleted: false,
            allStudents: []
        };
        
        // 创建一个干净的随机提问状态用于保存
        const cleanQuestionState = {
            isActive: false,
            currentQuestion: '',
            currentStudent: null,
            questionedStudents: [],
            unquestionedStudents: [],
            repeatScored: false,
            answerScored: false,
            allStudents: []
        };
        
        const dataToSave = {
            students,
            attendanceRecords,
            classes,
            currentClass: null, // 不保存当前班级选择，每次启动时需要重新选择
            rollCallState: cleanRollCallState, // 总是保存干净的状态
            questionState: cleanQuestionState, // 总是保存干净的提问状态
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('attendanceSystem', JSON.stringify(dataToSave));
        
        // 显示保存状态提示
        console.log('数据已保存:', new Date().toLocaleTimeString());
        updateDataStatus('已保存 ' + new Date().toLocaleTimeString());
        
        return true;
    } catch (error) {
        console.error('数据保存失败:', error);
        showNotification('数据保存失败！', 'error');
        return false;
    }
}

function loadDataFromStorage() {
    try {
        const saved = localStorage.getItem('attendanceSystem');
        if (saved) {
            const data = JSON.parse(saved);
            
            students = data.students || [];
            attendanceRecords = data.attendanceRecords || [];
            classes = data.classes || [];
            currentClass = null; // 每次启动时不自动选择班级
            rollCallState = data.rollCallState || {
                isActive: false,
                mode: null,
                currentStudentIndex: 0,
                calledStudents: [],
                uncalledStudents: [],
                currentStudent: null,
                isCompleted: false,
                allStudents: []
            };
            
            // 数据迁移：为没有统计字段的学生添加字段
            students.forEach(student => {
                if (student.score === undefined) {
                    student.score = 0;
                }
                if (student.totalAttendance === undefined) {
                    student.totalAttendance = 0;
                }
                if (student.presentCount === undefined) {
                    student.presentCount = 0;
                }
                if (student.lateCount === undefined) {
                    student.lateCount = 0;
                }
                if (student.absentCount === undefined) {
                    student.absentCount = 0;
                }
            });
            
            // 显示数据加载信息
            if (data.lastSaved) {
                console.log('数据加载成功，上次保存时间:', new Date(data.lastSaved).toLocaleString());
                updateDataStatus('已加载 ' + new Date(data.lastSaved).toLocaleString());
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('数据加载失败:', error);
        showNotification('数据加载失败，将使用默认数据！', 'error');
        return false;
    }
}

// 更新数据状态显示
function updateDataStatus(message) {
    const statusElement = document.getElementById('data-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = '#48bb78'; // 绿色表示成功
        
        // 3秒后淡化显示
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.color = '#999';
            }
        }, 3000);
    }
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                showModule('attendance');
                break;
            case '2':
                e.preventDefault();
                showModule('ranking');
                break;
            case '3':
                e.preventDefault();
                showModule('classes');
                break;
            case '4':
                e.preventDefault();
                showModule('management');
                break;
        }
    }
});

// 生成测试Excel文件
function generateTestExcel() {
    // 生成随机学生数据（只包含姓名和学号）
    const testStudents = [
        ['姓名', '学号'], // 标题行
        ['张三', '2024001'],
        ['李四', '2024002'],
        ['王五', '2024003'],
        ['赵六', '2024004'],
        ['钱七', '2024005'],
        ['孙八', '2024006'],
        ['周九', '2024007'],
        ['吴十', '2024008'],
        ['郑十一', '2024009'],
        ['王十二', '2024010'],
        ['冯十三', '2024011'],
        ['陈十四', '2024012'],
        ['褚十五', '2024013'],
        ['卫十六', '2024014'],
        ['蒋十七', '2024015'],
        ['沈十八', '2024016'],
        ['韩十九', '2024017'],
        ['杨二十', '2024018'],
        ['朱二一', '2024019'],
        ['秦二二', '2024020']
    ];
    
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(testStudents);
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 15 }, // 姓名列
            { wch: 15 }  // 学号列
        ];
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '学生名单');
        
        // 生成Excel文件并下载
        XLSX.writeFile(wb, '学生名单测试.xlsx');
        
        showNotification('测试Excel文件已生成并下载！（格式：姓名、学号）');
        
    } catch (error) {
        console.error('生成Excel文件错误:', error);
        showNotification('生成Excel文件失败！', 'error');
    }
}

// 导出排名Excel文件
function exportRankingExcel() {
    const selectedClassId = document.getElementById('ranking-class-selector')?.value;
    
    if (!selectedClassId) {
        showNotification('请先选择班级！', 'error');
        return;
    }
    
    const classStudents = students.filter(s => s.classId == selectedClassId);
    
    if (classStudents.length === 0) {
        showNotification('该班级暂无学生数据！', 'error');
        return;
    }
    
    // 获取班级信息
    const currentClassInfo = classes.find(c => c.id == selectedClassId);
    const className = currentClassInfo ? currentClassInfo.name : '未知班级';
    
    // 计算每个学生的统计数据
    const studentStats = classStudents.map(student => {
        // 使用学生对象中存储的统计数据，如果没有则从历史记录计算
        let presentCount = student.presentCount || 0;
        let lateCount = student.lateCount || 0;
        let absentCount = student.absentCount || 0;
        let totalCalls = student.totalAttendance || 0;
        
        // 如果学生对象中没有统计数据，从历史记录中计算
        if (totalCalls === 0) {
            const studentRecords = attendanceRecords.filter(record => record.studentId === student.id);
            presentCount = studentRecords.filter(record => record.status === 'present').length;
            lateCount = studentRecords.filter(record => record.status === 'late').length;
            absentCount = studentRecords.filter(record => record.status === 'absent').length;
            totalCalls = presentCount + lateCount + absentCount;
        }
        
        return {
            ...student,
            totalCalls,
            presentCount,
            lateCount,
            absentCount
        };
    });
    
    // 按积分排序
    studentStats.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score; // 积分高的在前
        }
        const aAttendanceRate = a.totalCalls > 0 ? Math.round(((a.presentCount + a.lateCount) / a.totalCalls) * 100) : 0;
        const bAttendanceRate = b.totalCalls > 0 ? Math.round(((b.presentCount + b.lateCount) / b.totalCalls) * 100) : 0;
        if (bAttendanceRate !== aAttendanceRate) {
            return bAttendanceRate - aAttendanceRate; // 出勤率高的在前
        }
        return b.presentCount - a.presentCount; // 出席次数多的在前
    });
    
    // 准备Excel数据
    const excelData = [
        ['排名', '学号', '姓名', '班级', '随机点名次数', '总积分', '出勤率', '出席次数', '迟到次数', '缺席次数'] // 标题行
    ];
    
    studentStats.forEach((student, index) => {
        const attendanceRate = student.totalCalls > 0 ? 
            Math.round(((student.presentCount + student.lateCount) / student.totalCalls) * 100) : 0;
        
        excelData.push([
            index + 1, // 排名
            student.studentId, // 学号
            student.name, // 姓名
            className, // 班级
            student.totalCalls, // 随机点名次数
            student.score || 0, // 总积分
            `${attendanceRate}%`, // 出勤率
            student.presentCount, // 出席次数
            student.lateCount, // 迟到次数
            student.absentCount // 缺席次数
        ]);
    });
    
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 8 },  // 排名
            { wch: 15 }, // 学号
            { wch: 12 }, // 姓名
            { wch: 15 }, // 班级
            { wch: 15 }, // 随机点名次数
            { wch: 10 }, // 总积分
            { wch: 10 }, // 出勤率
            { wch: 10 }, // 出席次数
            { wch: 10 }, // 迟到次数
            { wch: 10 }  // 缺席次数
        ];
        
        // 设置标题行样式
        const headerRange = XLSX.utils.decode_range(ws['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "CCCCCC" } },
                alignment: { horizontal: "center" }
            };
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '学生排名统计');
        
        // 生成文件名（包含班级名称和时间戳）
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${className}_学生排名统计_${timestamp}.xlsx`;
        
        // 生成Excel文件并下载
        XLSX.writeFile(wb, filename);
        
        showNotification(`${className} 排名统计Excel文件已生成并下载！`);
        
    } catch (error) {
        console.error('导出Excel文件错误:', error);
        showNotification('导出Excel文件失败！', 'error');
    }
}

// 随机提问功能
function startRandomQuestion() {
    if (!currentClass) {
        showNotification('请先在管理模块中选择班级！', 'error');
        return;
    }
    
    const currentClassStudents = students.filter(s => s.classId === currentClass.id);
    
    if (currentClassStudents.length === 0) {
        showNotification('当前班级没有学生数据！', 'error');
        return;
    }
    
    // 注意：随机提问不重置学生出勤状态，保持之前的点名结果
    
    // 初始化随机提问状态
    questionState = {
        isActive: true,
        currentQuestion: '',
        currentStudent: null,
        questionedStudents: [],
        unquestionedStudents: [...currentClassStudents],
        repeatScored: false,
        answerScored: false,
        allStudents: [...currentClassStudents]
    };
    
    // 随机选择第一个学生
    selectRandomQuestionStudent();
    
    updateAttendanceDisplay();
    saveDataToStorage();
    
    showNotification(`开始随机提问模式！当前班级: ${currentClass.name}`);
}

function selectRandomQuestionStudent() {
    if (questionState.unquestionedStudents.length === 0) {
        showNotification('所有学生都已被提问！');
        return;
    }
    
    // 使用加权随机选择
    questionState.currentStudent = selectWeightedRandomStudent(questionState.unquestionedStudents);
    
    // 重置评分状态
    questionState.repeatScored = false;
    questionState.answerScored = false;
    
    updateQuestionInterface();
    
    showNotification(`请对 ${questionState.currentStudent.name} 进行评分`);
}


function scoreRepeat(score) {
    if (!questionState.currentStudent || questionState.repeatScored) {
        return;
    }
    
    const student = students.find(s => s.id === questionState.currentStudent.id);
    if (student) {
        student.score = (student.score || 0) + score;
        questionState.repeatScored = true;
        
        const scoreText = score > 0 ? `+${score}分` : `${score}分`;
        showNotification(`${student.name} 问题重复评分：${scoreText}，总分: ${student.score}`);
        
        saveDataToStorage();
        
        // 评分完成后自动退出提问模式
        setTimeout(() => {
            endRandomQuestion();
        }, 1500); // 1.5秒后自动退出，让用户看到评分结果
    }
}

function scoreAnswer(score) {
    if (!questionState.currentStudent || questionState.answerScored) {
        return;
    }
    
    const student = students.find(s => s.id === questionState.currentStudent.id);
    if (student) {
        student.score = (student.score || 0) + score;
        questionState.answerScored = true;
        
        showNotification(`${student.name} 问题回答评分：+${score}分，总分: ${student.score}`);
        
        saveDataToStorage();
        
        // 评分完成后自动退出提问模式
        setTimeout(() => {
            endRandomQuestion();
        }, 1500); // 1.5秒后自动退出，让用户看到评分结果
    }
}


function endRandomQuestion() {
    questionState = {
        isActive: false,
        currentQuestion: '',
        currentStudent: null,
        questionedStudents: [],
        unquestionedStudents: [],
        repeatScored: false,
        answerScored: false,
        allStudents: []
    };
    
    updateAttendanceDisplay();
    saveDataToStorage();
    
    showNotification('随机提问已结束');
}

function updateQuestionInterface() {
    // 重置评分按钮状态
    document.getElementById('repeat-correct').disabled = false;
    document.getElementById('repeat-incorrect').disabled = false;
    document.getElementById('answer-0-5').disabled = false;
    document.getElementById('answer-1').disabled = false;
    document.getElementById('answer-2').disabled = false;
    document.getElementById('answer-3').disabled = false;
    
    // 显示主评分界面，隐藏重复评分界面
    document.getElementById('main-evaluation').style.display = 'block';
    document.getElementById('repeat-evaluation').style.display = 'none';
}

// 显示问题重复评分界面
function showRepeatEvaluation() {
    document.getElementById('main-evaluation').style.display = 'none';
    document.getElementById('repeat-evaluation').style.display = 'block';
}

// 返回主评分界面
function backToMainEvaluation() {
    document.getElementById('main-evaluation').style.display = 'block';
    document.getElementById('repeat-evaluation').style.display = 'none';
}

// 为随机提问模式显示学生信息（不显示出勤按钮）
function displayCurrentStudentForQuestion(student) {
    document.getElementById('called-student-name').textContent = student.name;
    document.getElementById('called-student-id').textContent = `学号: ${student.studentId}`;
    
    // 添加动画效果
    const studentCard = document.querySelector('.called-student-card');
    studentCard.classList.remove('highlight');
    setTimeout(() => {
        studentCard.classList.add('highlight');
    }, 100);
    
    // 隐藏出勤状态按钮
    const attendanceButtons = document.querySelector('.attendance-buttons');
    if (attendanceButtons) {
        attendanceButtons.style.display = 'none';
    }
}

// 自动保存 - 更频繁的保存频率
setInterval(saveDataToStorage, 10000); // 每10秒自动保存一次

// 页面关闭前保存数据
window.addEventListener('beforeunload', function(e) {
    saveDataToStorage();
    // 不显示确认对话框，直接保存
});

// 页面可见性变化时保存数据
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        saveDataToStorage();
    }
});


// 初始化学生数据功能
function initializeStudentData() {
    if (!currentClass) {
        showNotification('请先选择班级！', 'error');
        return;
    }
    
    const currentClassStudents = students.filter(s => s.classId === currentClass.id);
    
    if (currentClassStudents.length === 0) {
        showNotification('当前班级没有学生！', 'error');
        return;
    }
    
    if (confirm(`确定要初始化 ${currentClass.name} 的所有学生数据吗？\n\n这将重置：\n• 所有学生的积分为0\n• 所有学生的出勤统计数据\n• 该班级的历史出勤记录\n\n注意：此操作不可撤销！`)) {
        // 重置当前班级学生的所有数据
        currentClassStudents.forEach(student => {
            student.score = 0;
            student.totalAttendance = 0;
            student.presentCount = 0;
            student.lateCount = 0;
            student.absentCount = 0;
            student.status = 'unknown';
        });
        
        // 删除该班级的历史出勤记录
        attendanceRecords = attendanceRecords.filter(record => record.classId !== currentClass.id);
        
        // 重置点名状态
        resetRollCallState();
        
        // 更新显示和保存数据
        updateAllDisplays();
        saveDataToStorage();
        
        showNotification(`${currentClass.name} 的学生数据初始化成功！共重置了 ${currentClassStudents.length} 名学生的数据。`);
    }
}
