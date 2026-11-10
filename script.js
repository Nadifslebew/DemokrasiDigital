"use strict";

// Isi Project URL dan publishable key setelah menjalankan skema Supabase.
// Secret key dipakai di Apps Script saja.
const SUPABASE_URL = "https://abjcngphnerdyxlpbckn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_owHY45-IHSv9rMGzKGhQrg_ps7Xi5Fy";

const questions = [
  {
    prompt: "Apa konteks yang memicu ramainya unggahan Garuda Biru pada Agustus 2024?",
    options: [
      "Pengumuman hasil Pemilu Presiden.",
      "Pembahasan revisi UU Pilkada setelah putusan MK.",
      "Pengumuman jadwal penerimaan mahasiswa baru.",
      "Perubahan aturan penggunaan media sosial."
    ],
    correct: 1,
    explanation: "Unggahan Garuda Biru ramai saat warga menyoroti pembahasan revisi aturan pencalonan kepala daerah setelah putusan MK."
  },
  {
    prompt: "Baleg setuju membawa RUU Pilkada ke paripurna. Apa artinya?",
    options: [
      "RUU otomatis berlaku hari itu juga.",
      "Putusan MK langsung dibatalkan.",
      "Pilkada otomatis ditunda.",
      "RUU maju ke tahap berikutnya dan masih perlu pengesahan."
    ],
    correct: 3,
    explanation: "Menyetujui RUU untuk dibawa ke paripurna dan mengesahkan RUU adalah tahap yang berbeda. Agenda pengesahan pada 22 Agustus kemudian batal."
  },
  {
    prompt: "Ada tangkapan layar tanpa tanggal di grup. Apa yang kamu lakukan sebelum meneruskannya?",
    options: [
      "Cari sumber asli, periksa tanggal, dan bandingkan laporannya.",
      "Teruskan kalau pengirimnya teman dekat.",
      "Pakai jumlah suka untuk menilai kebenarannya.",
      "Bagikan dulu agar orang lain bisa mengeceknya."
    ],
    correct: 0,
    explanation: "Sumber, tanggal, dan laporan pembanding membantumu menilai apakah gambar mendukung klaim dalam konteks aslinya."
  },
  {
    prompt: "Kamu telanjur membagikan klaim keliru di grup kampus. Apa langkah berikutnya?",
    options: [
      "Tunggu anggota lain yang mengoreksi.",
      "Hapus pesan diam-diam dan lanjutkan diskusi.",
      "Kirim koreksi beserta sumber ke grup yang sama.",
      "Bagikan koreksi ke grup lain."
    ],
    correct: 2,
    explanation: "Koreksi di grup yang sama membantu orang yang sempat melihat klaim awal mendapatkan informasi yang benar."
  },
  {
    prompt: "Diskusi sedang panas. Mana cara yang bertanggung jawab untuk menyampaikan pendapat?",
    options: [
      "Sebarkan profil pribadi orang yang berbeda pendapat.",
      "Tanggapi argumennya dengan rujukan dan jaga privasinya.",
      "Teruskan potongan komentar tanpa konteks.",
      "Pilih pendapat yang paling sering dibagikan."
    ],
    correct: 1,
    explanation: "Rujukan membuat klaim bisa diperiksa. Menjaga privasi membantu diskusi tetap berfokus pada persoalan yang dibahas."
  }
];

const byId = (id) => document.getElementById(id);
const frames = Array.from(document.querySelectorAll("[data-frame]"));
const quizIndex = frames.findIndex((frame) => frame.dataset.frame === "Kuis");
const resultIndex = quizIndex + 1;
const navigation = byId("navigation");
const nextFrame = byId("next-frame");
const quizForm = byId("quiz-form");
const answerOptions = byId("answer-options");
const questionTitle = byId("quiz-title");
const checkAnswer = byId("check-answer");
const nextQuestion = byId("next-question");
const feedback = byId("feedback");
const recapForm = byId("recap-form");
const recapStatus = byId("recap-status");
const participantAlias = byId("participant-alias");
const sendRecap = byId("send-recap");
const restartQuiz = byId("restart-quiz");
const supabaseUrl = SUPABASE_URL.trim().replace(/\/$/, "");
const publishableKey = SUPABASE_PUBLISHABLE_KEY.trim();
const recapReady = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseUrl) && publishableKey.startsWith("sb_publishable_");
const answers = [];

let currentFrame = 0;
let currentQuestion = 0;
let recapAttemptId = null;

function showFrame(index) {
  frames[currentFrame].hidden = true;
  currentFrame = index;
  const frame = frames[index];
  frame.hidden = false;

  const chapter = String(index + 1).padStart(2, "0");
  byId("frame-number").textContent = chapter + " / " + String(frames.length).padStart(2, "0");
  byId("frame-label").textContent = frame.dataset.frame;
  byId("home-footer").hidden = index !== 0;
  navigation.hidden = index === 0;
  nextFrame.hidden = index >= quizIndex;
  if (!nextFrame.hidden) {
    byId("next-frame-label").textContent = [
      "", "Lihat kronologi", "Belajar cek informasi", "Lihat panduan", "Mulai kuis"
    ][index];
  }

  frame.querySelector("h1, h2").focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function showFeedback(question, answer) {
  const correct = answer === question.correct;
  answerOptions.querySelectorAll("input").forEach((input, index) => {
    input.disabled = true;
    if (index === question.correct) input.parentElement.dataset.state = "correct";
    if (!correct && index === answer) input.parentElement.dataset.state = "incorrect";
  });
  feedback.dataset.state = correct ? "correct" : "incorrect";
  byId("feedback-title").textContent = correct ? "Tepat!" : "Belum tepat.";
  byId("feedback-body").textContent = question.explanation;
  feedback.hidden = false;
  checkAnswer.hidden = true;
  nextQuestion.hidden = false;
  byId("next-question-label").textContent = currentQuestion === questions.length - 1 ? "Lihat hasil" : "Soal berikutnya";
  byId("quiz-progress").value = answers.length;
}

function renderQuestion() {
  const question = questions[currentQuestion];
  const previousAnswer = answers[currentQuestion];
  byId("question-count").textContent = "05 / Kuis · Soal " + (currentQuestion + 1) + " dari " + questions.length;
  questionTitle.textContent = question.prompt;
  byId("quiz-progress").max = questions.length;
  byId("quiz-progress").value = answers.length;
  answerOptions.replaceChildren();

  question.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "answer";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = String(index);
    input.required = true;
    input.checked = index === previousAnswer;
    const text = document.createElement("span");
    text.textContent = option;
    label.append(input, text);
    answerOptions.append(label);
  });

  checkAnswer.hidden = false;
  nextQuestion.hidden = true;
  feedback.hidden = true;
  if (previousAnswer !== undefined) showFeedback(question, previousAnswer);
}

function renderResult() {
  const correctCount = answers.filter((answer, index) => answer === questions[index].correct).length;
  const score = correctCount + "/" + questions.length;
  const passed = correctCount >= 4;
  byId("score").textContent = score;
  byId("badge-name").textContent = passed ? "Penyaring Informasi" : "Penjelajah Demokrasi";
  byId("result-message").textContent = passed
    ? "Kamu bisa membedakan tahapan peristiwa dan memilih cara memeriksa informasi."
    : "Kamu sudah menuntaskan modul. Ulangi kuis kapan saja untuk berlatih.";
}

function downloadBadge() {
  const markup = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">',
    '<rect width="900" height="540" rx="24" fill="#173bb6"/>',
    '<rect x="26" y="26" width="848" height="488" rx="16" fill="none" stroke="#8ba5fa" stroke-width="2"/>',
    '<g font-family="Lato, Arial, sans-serif" text-anchor="middle" fill="white">',
    '<text x="450" y="96" font-size="24" font-weight="700" letter-spacing="3">DEMOKRASIDIGITAL</text>',
    '<circle cx="450" cy="192" r="48" fill="#e5f58e"/>',
    '<path d="m428 193 15 15 29-32" fill="none" stroke="#173bb6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
    '<text id="title" x="450" y="321" font-size="54" font-weight="900"/>',
    '<text x="450" y="375" font-size="23">Modul Peringatan Darurat 2024</text>',
    '<text id="badge-score" x="450" y="444" font-size="26" font-weight="700" fill="#e5f58e"/>',
    '</g></svg>'
  ].join("");
  const badge = new DOMParser().parseFromString(markup, "image/svg+xml");
  badge.getElementById("title").textContent = byId("badge-name").textContent;
  badge.getElementById("badge-score").textContent = byId("score").textContent + " jawaban benar";

  const link = document.createElement("a");
  const svg = new XMLSerializer().serializeToString(badge);
  link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  link.download = "lencana-demokrasidigital.svg";
  document.body.append(link);
  link.click();
  link.remove();
}

const start = byId("start");
start.addEventListener("click", () => showFrame(1));
start.disabled = false;
byId("previous-frame").addEventListener("click", () => showFrame(currentFrame - 1));
nextFrame.addEventListener("click", () => showFrame(currentFrame + 1));

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = answerOptions.querySelector("input:checked");
  if (!selected || answers[currentQuestion] !== undefined) return;
  const answer = Number(selected.value);
  answers[currentQuestion] = answer;
  showFeedback(questions[currentQuestion], answer);
  feedback.focus();
});

nextQuestion.addEventListener("click", () => {
  if (currentQuestion === questions.length - 1) {
    renderResult();
    showFrame(resultIndex);
    return;
  }
  currentQuestion += 1;
  renderQuestion();
  questionTitle.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});

restartQuiz.addEventListener("click", () => {
  answers.length = 0;
  currentQuestion = 0;
  recapAttemptId = null;
  recapForm.reset();
  participantAlias.readOnly = false;
  sendRecap.disabled = false;
  recapStatus.textContent = "";
  renderQuestion();
  showFrame(quizIndex);
});

byId("download-badge").addEventListener("click", downloadBadge);
recapForm.hidden = !recapReady;
byId("recap-unavailable").hidden = recapReady;
recapForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!recapReady || sendRecap.disabled || currentFrame !== resultIndex) return;

  sendRecap.disabled = true;
  participantAlias.readOnly = true;
  restartQuiz.disabled = true;
  recapStatus.textContent = "Mengirim hasil…";
  try {
    recapAttemptId ??= crypto.randomUUID();
    const response = await fetch(supabaseUrl + "/rest/v1/rpc/demokrasidigital_submit_quiz", {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_attempt_id: recapAttemptId,
        p_alias: participantAlias.value.trim() || null,
        p_answers: answers
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error("Supabase HTTP " + response.status);
    recapStatus.textContent = "Hasil kuismu sudah masuk ke rekap.";
  } catch {
    recapStatus.textContent = "Pengiriman belum terkonfirmasi. Tekan Kirim hasil untuk mencoba lagi.";
    sendRecap.disabled = false;
  } finally {
    restartQuiz.disabled = false;
  }
});

renderQuestion();
