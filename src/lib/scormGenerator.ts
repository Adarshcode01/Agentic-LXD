import JSZip from 'jszip';
import { Course, CourseScreen } from '../types/lms';

export function generateCourseHtml(course: Course): string {
  // Flatten screens across chapters
  const allScreens: { chapterTitle: string; screen: CourseScreen }[] = [];
  if (course.chapters && course.chapters.length > 0) {
    course.chapters.forEach(ch => {
      ch.screens.forEach(sc => {
        allScreens.push({ chapterTitle: ch.title, screen: sc });
      });
    });
  } else if (course.sections && course.sections.length > 0) {
    // Legacy fallback
    course.sections.forEach((sec, idx) => {
      allScreens.push({
        chapterTitle: sec.title,
        screen: {
          id: sec.id,
          chapterId: 'ch-1',
          screenNumber: idx + 1,
          title: sec.title,
          interactionType: 'process_flow',
          bodyText: sec.content,
          sourceExcerpt: sec.content,
          aiInstructionalNote: 'Standard content converted from source',
          isLocked: false,
          isEdited: false,
          interactionData: {
            processSteps: sec.takeaways.map((t, i) => ({
              stepNumber: i + 1,
              title: `Key Step ${i + 1}`,
              description: t
            }))
          }
        }
      });
    });
  }

  const screensJson = JSON.stringify(allScreens);
  const quizJson = JSON.stringify(course.quiz || []);
  const brandPrimary = course.brandTheme?.primaryColor || '#1A73E8';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(course.title)} - SCORM / cmi5 / xAPI Interactive Module</title>
  <style>
    :root {
      --primary: ${brandPrimary};
      --primary-hover: #1557B0;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success: #137333;
      --danger: #C5221F;
      --warning: #B06000;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    /* Top Header Bar */
    .top-bar {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .top-title h1 { font-size: 16px; font-weight: 700; color: var(--text); }
    .top-title .chapter-label { font-size: 12px; color: var(--text-muted); }
    .status-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .status-badge {
      font-weight: 600;
      font-family: monospace;
      padding: 2px 8px;
      border-radius: 4px;
      background: #F1F5F9;
    }
    .status-badge.passed { background: #ECFDF5; color: var(--success); }
    .status-badge.failed { background: #FEF2F2; color: var(--danger); }

    /* Progress bar */
    .progress-track {
      width: 120px;
      height: 6px;
      background: #E2E8F0;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--primary);
      width: 0%;
      transition: width 0.3s ease;
    }

    /* Main Container */
    .workspace {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    /* Left TOC Navigation */
    .toc-sidebar {
      width: 260px;
      background: #FFFFFF;
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 16px;
      flex-shrink: 0;
    }
    .toc-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      margin-bottom: 4px;
      transition: all 0.15s;
    }
    .toc-item:hover { background: #F1F5F9; color: var(--text); }
    .toc-item.active { background: #EFF6FF; color: var(--primary); font-weight: 600; }
    .toc-item .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #CBD5E1;
    }
    .toc-item.active .dot { background: var(--primary); }
    .toc-item.completed .dot { background: var(--success); }

    /* Center Stage / Screen Canvas */
    .stage {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
      background: #FAFAFA;
      display: flex;
      justify-content: center;
    }
    .screen-card {
      max-width: 820px;
      width: 100%;
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      min-height: 520px;
      display: flex;
      flex-direction: column;
    }
    .screen-header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .screen-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--primary);
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .screen-title { font-size: 22px; font-weight: 700; color: var(--text); }
    .screen-body { font-size: 15px; color: #334155; line-height: 1.7; margin-bottom: 24px; }

    /* Interaction Widgets */
    /* 1. Process Flow */
    .process-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .process-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #FFFFFF;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .process-card:hover { border-color: var(--primary); background: #F8FAFC; }
    .process-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #EFF6FF;
      color: var(--primary);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .process-content h4 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .process-content p { font-size: 13px; color: var(--text-muted); }

    /* 2. Flip Cards */
    .flip-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .flip-card {
      height: 160px;
      perspective: 1000px;
      cursor: pointer;
    }
    .flip-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
      border-radius: 8px;
    }
    .flip-card.flipped .flip-inner { transform: rotateY(180deg); }
    .flip-front, .flip-back {
      position: absolute;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border: 1px solid var(--border);
    }
    .flip-front {
      background: #F8FAFC;
      text-align: center;
    }
    .flip-front strong { font-size: 15px; color: var(--text); }
    .flip-front .hint { font-size: 11px; color: var(--primary); margin-top: 8px; }
    .flip-back {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #1E3A8A;
      transform: rotateY(180deg);
      font-size: 13px;
    }

    /* 3. Timeline */
    .timeline-container {
      position: relative;
      padding-left: 28px;
      margin-bottom: 24px;
    }
    .timeline-container::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background: #E2E8F0;
    }
    .timeline-node {
      position: relative;
      margin-bottom: 20px;
    }
    .timeline-node::before {
      content: '';
      position: absolute;
      left: -23px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary);
      border: 2px solid #FFFFFF;
    }
    .timeline-time { font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; }
    .timeline-label { font-size: 14px; font-weight: 600; color: var(--text); }
    .timeline-details { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

    /* 4. Comparison Cards */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .comp-col {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      background: #FFFFFF;
    }
    .comp-col.col-a { border-top: 4px solid #64748B; }
    .comp-col.col-b { border-top: 4px solid var(--primary); background: #F8FAFC; }
    .comp-header { font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }

    /* 5. Branching Scenario */
    .scenario-box {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .scenario-box h4 { font-size: 14px; font-weight: 700; color: #92400E; margin-bottom: 6px; }
    .scenario-choices { display: flex; flex-direction: column; gap: 8px; }
    .scenario-choice-btn {
      text-align: left;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .scenario-choice-btn:hover { border-color: var(--primary); background: #F8FAFC; }
    .scenario-feedback {
      display: none;
      padding: 14px;
      border-radius: 6px;
      font-size: 13px;
      margin-top: 12px;
    }

    /* Navigation Footer */
    .screen-footer {
      margin-top: auto;
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .nav-btn.prev {
      background: #F1F5F9;
      color: var(--text-muted);
    }
    .nav-btn.prev:hover { background: #E2E8F0; color: var(--text); }
    .nav-btn.next {
      background: var(--primary);
      color: #FFFFFF;
    }
    .nav-btn.next:hover { background: var(--primary-hover); }

    /* Quiz Assessment Screen */
    .quiz-question-block {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .quiz-opt-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .quiz-opt-label:hover { background: #F8FAFC; }
    .quiz-opt-label.correct { background: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
    .quiz-opt-label.incorrect { background: #FEF2F2; border-color: #FECACA; color: #991B1B; }
  </style>
</head>
<body>
  <!-- Top Bar -->
  <div class="top-bar">
    <div class="top-title">
      <div class="chapter-label" id="top-chapter-name">Chapter 1</div>
      <h1 id="top-course-title">${escapeHtml(course.title)}</h1>
    </div>

    <div class="status-strip">
      <div class="progress-track" title="Course Progress">
        <div class="progress-fill" id="progress-bar-fill"></div>
      </div>
      <span id="screen-progress-label">Screen 1 of 1</span>
      <span>·</span>
      <span id="completion-badge" class="status-badge">Incomplete</span>
      <span>·</span>
      <span id="score-badge" class="status-badge">Score: --</span>
    </div>
  </div>

  <!-- Workspace -->
  <div class="workspace">
    <!-- Left Table of Contents -->
    <div class="toc-sidebar">
      <div class="toc-header">Course Modules & Screens</div>
      <div id="toc-list"></div>
      <div class="toc-header" style="margin-top: 24px;">Assessment</div>
      <div class="toc-item" id="toc-quiz-item" onclick="goToQuiz()">
        <span class="dot"></span>
        <span>Knowledge Check</span>
      </div>
    </div>

    <!-- Center Stage -->
    <div class="stage">
      <div class="screen-card">
        <div id="screen-container">
          <!-- Dynamic Screen Content -->
        </div>

        <!-- Bottom Navigation -->
        <div class="screen-footer">
          <button class="nav-btn prev" id="btn-prev" onclick="navigate(-1)">← Previous</button>
          <span style="font-size: 12px; color: var(--text-muted);" id="footer-counter">1 / 1</span>
          <button class="nav-btn next" id="btn-next" onclick="navigate(1)">Next Screen →</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const screens = ${screensJson};
    const quizData = ${quizJson};
    let currentIndex = 0;
    let completedScreens = new Set();
    let isQuizActive = false;
    let quizScore = null;
    let scormAPI = null;

    // SCORM 1.2 Discovery
    function findAPI(win) {
      try {
        let attempts = 0;
        while (win && !win.API && attempts < 10) {
          if (win.parent && win.parent !== win) {
            win = win.parent;
            attempts++;
          } else break;
        }
        return win ? win.API : null;
      } catch (e) { return null; }
    }

    function initRuntime() {
      scormAPI = findAPI(window);
      if (scormAPI) {
        scormAPI.LMSInitialize("");
        scormAPI.LMSSetValue("cmi.core.lesson_status", "incomplete");
        scormAPI.LMSCommit("");
      }
      emitXapi('launched', 'http://adlnet.gov/expapi/verbs/launched', 'User launched course package');
      renderTOC();
      renderScreen(0);
    }

    function renderTOC() {
      const list = document.getElementById('toc-list');
      list.innerHTML = screens.map((item, idx) => \`
        <div class="toc-item \${idx === currentIndex && !isQuizActive ? 'active' : ''} \${completedScreens.has(idx) ? 'completed' : ''}" onclick="goToScreen(\${idx})">
          <span class="dot"></span>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${idx + 1}. \${item.screen.title}</span>
        </div>
      \`).join('');
    }

    function renderScreen(index) {
      if (index < 0 || index >= screens.length) return;
      isQuizActive = false;
      currentIndex = index;
      completedScreens.add(index);

      const item = screens[index];
      const sc = item.screen;
      document.getElementById('top-chapter-name').innerText = item.chapterTitle;
      document.getElementById('footer-counter').innerText = (index + 1) + ' / ' + (screens.length + 1);

      // Calculate progress
      const progressPercent = Math.round((completedScreens.size / (screens.length + 1)) * 100);
      document.getElementById('progress-bar-fill').style.width = progressPercent + '%';
      document.getElementById('screen-progress-label').innerText = 'Screen ' + (index + 1) + ' of ' + (screens.length + 1) + ' (' + progressPercent + '%)';

      // Record SCORM progress
      if (scormAPI) {
        scormAPI.LMSSetValue("cmi.core.lesson_location", "screen_" + (index + 1));
        scormAPI.LMSCommit("");
      }
      emitXapi('progressed', 'http://adlnet.gov/expapi/verbs/progressed', 'User progressed to screen: ' + sc.title);

      // Render Screen Content
      let widgetHtml = '';
      const data = sc.interactionData || {};

      if (sc.interactionType === 'process_flow' && data.processSteps) {
        widgetHtml = '<div class="process-container">' + data.processSteps.map(st => \`
          <div class="process-card" onclick="this.style.borderColor='var(--primary)'; emitXapi('interacted', 'http://adlnet.gov/expapi/verbs/interacted', 'Interacted with process: \${st.title}')">
            <div class="process-num">\${st.stepNumber}</div>
            <div class="process-content">
              <h4>\${st.title}</h4>
              <p>\${st.description}</p>
            </div>
          </div>
        \`).join('') + '</div>';
      } else if (sc.interactionType === 'flip_card' && data.flipCards) {
        widgetHtml = '<div class="flip-grid">' + data.flipCards.map((fc, i) => \`
          <div class="flip-card" onclick="this.classList.toggle('flipped'); emitXapi('interacted', 'http://adlnet.gov/expapi/verbs/interacted', 'Flipped concept card')">
            <div class="flip-inner">
              <div class="flip-front">
                <strong>\${fc.front}</strong>
                <span class="hint">Click to flip definition ↻</span>
              </div>
              <div class="flip-back">
                <p>\${fc.back}</p>
              </div>
            </div>
          </div>
        \`).join('') + '</div>';
      } else if (sc.interactionType === 'timeline' && data.timelineMilestones) {
        widgetHtml = '<div class="timeline-container">' + data.timelineMilestones.map(tl => \`
          <div class="timeline-node">
            <div class="timeline-time">\${tl.timeOrPhase}</div>
            <div class="timeline-label">\${tl.label}</div>
            <div class="timeline-details">\${tl.details}</div>
          </div>
        \`).join('') + '</div>';
      } else if (sc.interactionType === 'comparison' && data.comparisonItems) {
        widgetHtml = '<div class="comparison-grid">' +
          '<div class="comp-col col-a"><div class="comp-header">Standard / Baseline</div>' +
          data.comparisonItems.map(c => \`<div style="font-size:13px; margin-bottom:8px;"><strong>\${c.criteria}:</strong> \${c.optionA}</div>\`).join('') +
          '</div>' +
          '<div class="comp-col col-b"><div class="comp-header">Recommended Protocol</div>' +
          data.comparisonItems.map(c => \`<div style="font-size:13px; margin-bottom:8px;"><strong>\${c.criteria}:</strong> \${c.optionB}</div>\`).join('') +
          '</div></div>';
      } else if (sc.interactionType === 'scenario' && data.scenarioBranch) {
        const sb = data.scenarioBranch;
        widgetHtml = \`
          <div class="scenario-box">
            <h4>Realistic Scenario Challenge:</h4>
            <p style="font-size:13px; margin-bottom:12px;">\${sb.context}</p>
            <div class="scenario-choices">
              \${sb.choices.map((ch, i) => \`
                <button class="scenario-choice-btn" onclick="handleScenarioChoice(\${i}, \${ch.isOptimal}, '\${escapeJs(ch.consequence)}')">
                  \${ch.choiceText}
                </button>
              \`).join('')}
            </div>
            <div id="scenario-feedback-box" class="scenario-feedback"></div>
          </div>
        \`;
      }

      document.getElementById('screen-container').innerHTML = \`
        <div class="screen-header">
          <div class="screen-kicker">\${sc.kicker || item.chapterTitle}</div>
          <h2 class="screen-title">\${sc.title}</h2>
        </div>
        <div class="screen-body">
          <p>\${sc.bodyText}</p>
        </div>
        \${widgetHtml}
      \`;

      document.getElementById('btn-prev').disabled = index === 0;
      document.getElementById('btn-next').innerText = index === screens.length - 1 ? 'Go to Knowledge Check →' : 'Next Screen →';

      renderTOC();
    }

    function handleScenarioChoice(index, isOptimal, consequence) {
      const fb = document.getElementById('scenario-feedback-box');
      fb.style.display = 'block';
      if (isOptimal) {
        fb.style.background = '#ECFDF5';
        fb.style.border = '1px solid #A7F3D0';
        fb.style.color = '#065F46';
        fb.innerHTML = '<strong>Optimal Decision:</strong> ' + consequence;
      } else {
        fb.style.background = '#FEF2F2';
        fb.style.border = '1px solid #FECACA';
        fb.style.color = '#991B1B';
        fb.innerHTML = '<strong>Suboptimal Choice:</strong> ' + consequence;
      }
      emitXapi('answered', 'http://adlnet.gov/expapi/verbs/answered', 'Scenario branch choice: ' + (isOptimal ? 'optimal' : 'suboptimal'));
    }

    function goToScreen(index) {
      renderScreen(index);
    }

    function goToQuiz() {
      isQuizActive = true;
      document.getElementById('top-chapter-name').innerText = 'Assessment';
      document.getElementById('footer-counter').innerText = (screens.length + 1) + ' / ' + (screens.length + 1);

      document.getElementById('screen-container').innerHTML = \`
        <div class="screen-header">
          <div class="screen-kicker">Final Mastery Verification</div>
          <h2 class="screen-title">Knowledge Check (5 Questions)</h2>
        </div>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:20px;">
          Answer the questions below to verify competency and record official completion. Passing threshold: 70%.
        </p>
        <form id="quiz-form" onsubmit="submitFinalQuiz(event)">
          \${quizData.map((q, qIdx) => \`
            <div class="quiz-question-block" id="q-block-\${qIdx}">
              <div style="font-weight:600; font-size:14px; margin-bottom:10px;">\${qIdx + 1}. \${q.question}</div>
              \${q.options.map((opt, optIdx) => \`
                <label class="quiz-opt-label" id="opt-label-\${qIdx}-\${optIdx}">
                  <input type="radio" name="q_\${qIdx}" value="\${optIdx}" required>
                  <span>\${opt}</span>
                </label>
              \`).join('')}
              <div id="feedback-\${qIdx}" style="display:none; font-size:12px; margin-top:8px; padding:8px 12px; border-radius:4px;"></div>
            </div>
          \`).join('')}
          <button type="submit" class="nav-btn next" style="width:100%; padding:14px; font-size:14px;">
            Submit Assessment & Record Telemetry
          </button>
        </form>
        <div id="quiz-result-banner" style="display:none; padding:18px; border-radius:8px; margin-top:20px; text-align:center;"></div>
      \`;

      document.getElementById('btn-prev').disabled = false;
      document.getElementById('btn-next').disabled = true;
      document.getElementById('btn-next').innerText = 'Completed';

      document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('active'));
      document.getElementById('toc-quiz-item').classList.add('active');
    }

    function submitFinalQuiz(e) {
      e.preventDefault();
      const form = new FormData(e.target);
      let correct = 0;

      quizData.forEach((q, idx) => {
        const selected = parseInt(form.get('q_' + idx), 10);
        const fbEl = document.getElementById('feedback-' + idx);
        fbEl.style.display = 'block';

        if (selected === q.correctAnswerIndex) {
          correct++;
          document.getElementById('opt-label-' + idx + '-' + selected).classList.add('correct');
          fbEl.style.background = '#ECFDF5';
          fbEl.style.color = '#065F46';
          fbEl.innerHTML = '<strong>Correct!</strong> ' + q.explanation;
        } else {
          if (!isNaN(selected)) document.getElementById('opt-label-' + idx + '-' + selected).classList.add('incorrect');
          document.getElementById('opt-label-' + idx + '-' + q.correctAnswerIndex).classList.add('correct');
          fbEl.style.background = '#FEF2F2';
          fbEl.style.color = '#991B1B';
          fbEl.innerHTML = '<strong>Incorrect.</strong> ' + q.explanation;
        }
      });

      const scorePct = Math.round((correct / quizData.length) * 100);
      const passed = scorePct >= 70;
      quizScore = scorePct;

      const scoreBadge = document.getElementById('score-badge');
      scoreBadge.innerText = 'Score: ' + scorePct + '%';
      scoreBadge.className = 'status-badge ' + (passed ? 'passed' : 'failed');

      const compBadge = document.getElementById('completion-badge');
      compBadge.innerText = 'Completed';
      compBadge.className = 'status-badge passed';

      document.getElementById('progress-bar-fill').style.width = '100%';
      document.getElementById('screen-progress-label').innerText = '100% Completed';

      const banner = document.getElementById('quiz-result-banner');
      banner.style.display = 'block';
      banner.style.background = passed ? '#ECFDF5' : '#FEF2F2';
      banner.style.border = '1px solid ' + (passed ? '#A7F3D0' : '#FECACA');
      banner.style.color = passed ? '#065F46' : '#991B1B';
      banner.innerHTML = \`
        <h3 style="font-size:18px; font-weight:700;">\${passed ? 'PASSED · ' : 'FAILED · '}\${scorePct}%</h3>
        <p style="font-size:13px; margin-top:4px;">
          \${passed ? 'Congratulations! Telemetry passed to LMS.' : 'Score below 70%. Predictive remediation micro-module queued.'}
        </p>
      \`;

      // Update SCORM runtime
      if (scormAPI) {
        scormAPI.LMSSetValue("cmi.core.score.raw", scorePct.toString());
        scormAPI.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
        scormAPI.LMSCommit("");
        scormAPI.LMSFinish("");
      }

      // Emit xAPI completion
      emitXapi(
        passed ? 'passed' : 'failed',
        passed ? 'http://adlnet.gov/expapi/verbs/passed' : 'http://adlnet.gov/expapi/verbs/failed',
        'Assessment ' + (passed ? 'Passed' : 'Failed') + ' with score ' + scorePct + '%',
        scorePct,
        passed
      );
    }

    function navigate(delta) {
      if (isQuizActive) {
        if (delta === -1) renderScreen(screens.length - 1);
        return;
      }
      const target = currentIndex + delta;
      if (target >= screens.length) {
        goToQuiz();
      } else if (target >= 0) {
        renderScreen(target);
      }
    }

    function emitXapi(verbName, verbId, description, scoreRaw, success) {
      const payload = {
        id: 'stmt-' + Date.now() + '-' + Math.random().toString(36).substring(2,6),
        timestamp: new Date().toISOString(),
        actor: { mbox: 'mailto:designer.trainee@example.corp', name: 'Learner Trainee' },
        verb: { id: verbId, display: { 'en-US': verbName } },
        object: {
          id: 'https://lms-ai-builder.cloud/modules/${course.id}',
          definition: { name: { 'en-US': '${escapeJs(course.title)}' }, type: 'http://adlnet.gov/expapi/activities/course' }
        },
        result: scoreRaw !== undefined ? { score: { raw: scoreRaw, scaled: scoreRaw / 100, min: 0, max: 100 }, success, completion: true } : undefined
      };

      // Notify parent app
      window.parent.postMessage({ type: 'XAPI_STATEMENT', statement: payload }, '*');

      // Attempt backend ingestion
      fetch('/api/ingest-xapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(e => {});
    }

    function escapeJs(str) {
      return (str || '').replace(/'/g, "\\\\'");
    }

    window.addEventListener('DOMContentLoaded', initRuntime);
  </script>
</body>
</html>`;
}

export function generateImsManifestXml(course: Course): string {
  return `<?xml version="1.0" standalone="no" ?>
<manifest identifier="MANIFEST-${course.id}" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-${course.id}">
    <organization identifier="ORG-${course.id}">
      <title>${escapeXml(course.title)}</title>
      <item identifier="ITEM-${course.id}" identifierref="RES-${course.id}">
        <title>${escapeXml(course.title)}</title>
        <adlcp:masteryscore>70</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-${course.id}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm_api.js"/>
    </resource>
  </resources>
</manifest>`;
}

export function generateCmi5Xml(course: Course): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<courseStructure xmlns="https://w3id.org/xapi/profiles/cmi5/v1/CourseStructure.xsd">
  <course id="urn:uuid:${course.id}">
    <title>
      <langstring lang="en-US">${escapeXml(course.title)}</langstring>
    </title>
    <description>
      <langstring lang="en-US">${escapeXml(course.description)}</langstring>
    </description>
  </course>
  <au id="urn:uuid:${course.id}-au1" launchMethod="AnyWindow">
    <title>
      <langstring lang="en-US">${escapeXml(course.title)} AU</langstring>
    </title>
    <description>
      <langstring lang="en-US">cmi5 Assignable Unit powered by Google Always Free LMS</langstring>
    </description>
    <url>index.html</url>
    <launchParameters></launchParameters>
    <entitlementKey></entitlementKey>
    <masteryScore>0.70</masteryScore>
  </au>
</courseStructure>`;
}

export function generateScormApiJs(): string {
  return `/**
 * SCORM 1.2 & cmi5 Client-side Adapter
 * Google Always Free LMS Builder
 */
window.API = window.API || {
  _data: {
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.score.raw": "0",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.core.student_name": "Trainee User",
    "cmi.core.student_id": "trainee-101",
    "cmi.core.lesson_location": "screen_1"
  },
  LMSInitialize: function(param) {
    console.log("[SCORM API] LMSInitialize called");
    return "true";
  },
  LMSFinish: function(param) {
    console.log("[SCORM API] LMSFinish called. Final state:", this._data);
    return "true";
  },
  LMSGetValue: function(element) {
    return this._data[element] || "";
  },
  LMSSetValue: function(element, value) {
    console.log("[SCORM API] LMSSetValue: " + element + " = " + value);
    this._data[element] = value;
    return "true";
  },
  LMSCommit: function(param) {
    return "true";
  },
  LMSGetLastError: function() { return "0"; },
  LMSGetErrorString: function() { return "No error"; },
  LMSGetDiagnostic: function() { return "No diagnostic information"; }
};
`;
}

// 1. SCORM 1.2 Package Zip
export async function createScorm12PackageZip(course: Course): Promise<Blob> {
  const zip = new JSZip();
  zip.file('index.html', generateCourseHtml(course));
  zip.file('imsmanifest.xml', generateImsManifestXml(course));
  zip.file('scorm_api.js', generateScormApiJs());
  zip.file('README.md', `# ${course.title} (SCORM 1.2 Package)
Approved Release: ${course.approvedVersion || 'v1.0'}
Approval Status: ${course.approvalStatus.toUpperCase()}

Upload directly into Moodle, Canvas, Blackboard, Cornerstone OnDemand, or any SCORM 1.2 compliant LMS.`);
  return await zip.generateAsync({ type: 'blob' });
}

// 2. cmi5 Package Zip
export async function createCmi5PackageZip(course: Course): Promise<Blob> {
  const zip = new JSZip();
  zip.file('index.html', generateCourseHtml(course));
  zip.file('cmi5.xml', generateCmi5Xml(course));
  zip.file('scorm_api.js', generateScormApiJs());
  zip.file('README.md', `# ${course.title} (cmi5 Package)
Approved Release: ${course.approvedVersion || 'v1.0'}
Assignable Unit ID: urn:uuid:${course.id}-au1
Mastery Score: 0.70

Compatible with cmi5 LMS / LRS runners (Veracity, Watershed, Learning Locker, Rustici Engine).`);
  return await zip.generateAsync({ type: 'blob' });
}

// 3. xAPI Launch Bundle with LRS Config
export async function createXapiBundleZip(course: Course, lrsConfig?: { endpoint: string; key: string }): Promise<Blob> {
  const zip = new JSZip();
  zip.file('index.html', generateCourseHtml(course));
  zip.file('tincan.xml', `<?xml version="1.0" encoding="utf-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="https://lms-ai-builder.cloud/courses/${course.id}" type="http://adlnet.gov/expapi/activities/course">
      <name lang="en-US">${escapeXml(course.title)}</name>
      <description lang="en-US">${escapeXml(course.description)}</description>
      <launch lang="en-US">index.html</launch>
    </activity>
  </activities>
</tincan>`);

  zip.file('lrs_config.json', JSON.stringify({
    endpoint: lrsConfig?.endpoint || 'https://lrs.example.corp/xAPI/',
    authKey: lrsConfig?.key || 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
    activityId: `https://lms-ai-builder.cloud/courses/${course.id}`,
    statementVerbsSupported: [
      'launched', 'progressed', 'interacted', 'answered', 'completed', 'passed', 'failed'
    ]
  }, null, 2));

  zip.file('README.md', `# ${course.title} (xAPI Standalone Bundle)
Contains tincan.xml and lrs_config.json for direct Learning Record Store (LRS) recording.`);
  return await zip.generateAsync({ type: 'blob' });
}

// Backward compatibility alias
export async function createScormPackageZip(course: Course): Promise<Blob> {
  return createScorm12PackageZip(course);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeJs(str: string): string {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
