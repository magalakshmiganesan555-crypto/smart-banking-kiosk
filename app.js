const camera = document.getElementById("camera");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraStatus = document.getElementById("cameraStatus");
const personDetected = document.getElementById("personDetected");
const faceFrame = document.getElementById("faceFrame");

const faceStatus = document.getElementById("faceStatus");
const passbookStatus = document.getElementById("passbookStatus");
const fingerprintStatus = document.getElementById("fingerprintStatus");

const assistantMessage = document.getElementById("assistantMessage");
const welcomeTitle = document.getElementById("welcomeTitle");
const processMessage = document.getElementById("processMessage");
const processStatus = document.getElementById("processStatus");

const withdrawRequest = document.getElementById("withdrawRequest");
const customerName = document.getElementById("customerName");
const withdrawAmount = document.getElementById("withdrawAmount");

const sessionStatus = document.getElementById("sessionStatus");
const speakingIndicator = document.getElementById("speakingIndicator");

const balanceBtn = document.getElementById("balanceBtn");
const withdrawBtn = document.getElementById("withdrawBtn");

let recognition = null;
let voices = [];
let sessionStarted = false;
let customerVerified = false;
let customer = "Ravi Kumar";
let currentStep = "idle";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function getTamilVoice() {
    return (
        voices.find(v =>
            v.lang.toLowerCase().startsWith("ta") &&
            /female|woman|kalpana|valluvar/i.test(v.name)
        ) ||
        voices.find(v =>
            v.lang.toLowerCase().startsWith("ta")
        ) ||
        voices.find(v =>
            v.lang.toLowerCase().startsWith("en-in")
        ) ||
        voices[0]
    );
}

function speak(text) {
    return new Promise(resolve => {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getTamilVoice();

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            utterance.lang = "ta-IN";
        }

        utterance.rate = 0.85;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        utterance.onstart = () => {
            speakingIndicator.style.visibility = "visible";
        };

        utterance.onend = () => {
            speakingIndicator.style.visibility = "visible";
            resolve();
        };

        utterance.onerror = () => {
            resolve();
        };

        speechSynthesis.speak(utterance);
    });
}

function setMessage(text) {
    assistantMessage.textContent = text;
    processMessage.textContent = text;
}

function setStep(element, success, text) {
    element.classList.toggle("success", success);
    element.querySelector("span").textContent = success ? "✓" : "◯";
    element.querySelector("small").textContent = text;
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        camera.srcObject = stream;

        camera.style.display = "block";
        cameraPlaceholder.style.display = "none";
        cameraStatus.textContent = "Camera Active";

        await camera.play();

        faceFrame.style.display = "block";

        setTimeout(() => {
            personDetected.style.display = "block";
            setStep(faceStatus, true, "Detected");
            beginSession();
        }, 1800);

    } catch (error) {
        cameraStatus.textContent = "Camera Permission Required";
        cameraPlaceholder.querySelector("p").textContent =
            "Please allow camera access";
        console.error(error);
    }
}

async function beginSession() {
    if (sessionStarted) return;

    sessionStarted = true;
    currentStep = "passbook";

    processStatus.textContent = "Verification Started";
    sessionStatus.textContent = "Verification in progress";

    await sleep(700);

    await speak(
        "வணக்கம், உங்களது வங்கி கணக்கு புத்தகத்தை டிஜிட்டல் திரையில் வைக்கவும்."
    );

    await sleep(2000);

    // Demo passbook verification
    setStep(passbookStatus, true, "Detected & Verified");
    processStatus.textContent = "Passbook Verified";

    setMessage("Passbook details verified.");

    await sleep(1200);

    await speak(
        "தயவுசெய்து உங்கள் கைரேகையை பதிவு செய்யவும்."
    );

    await sleep(2000);

    await fingerprintVerification();
}

async function fingerprintVerification() {

    setStep(fingerprintStatus, true, "Verified");

    await sleep(800);

    processStatus.textContent = "Identity Verification";

    // Demo identity verification
    await sleep(1500);

    customerVerified = true;

    await speak(
        "உங்கள் அடையாளம் வெற்றிகரமாக சரிபார்க்கப்பட்டது."
    );

    await sleep(2000);

    welcomeTitle.textContent = "வணக்கம்!";

    await speak(
        `வணக்கம், ${customer}. நான் உங்களுக்கு எவ்வாறு உதவ வேண்டும்?`
    );

    await sleep(1000);

    sessionStatus.textContent = "Listening for customer request";

    startVoiceRecognition();
}

function startVoiceRecognition() {

    if (!("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)) {

        processMessage.textContent =
            "Voice recognition is not supported in this browser.";

        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();

    recognition.lang = "ta-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {

        const text = event.results[0][0].transcript.toLowerCase();

        processMessage.textContent = "Customer: " + text;

        if (
            text.includes("balance") ||
            text.includes("இருப்பு") ||
            text.includes("பேலன்ஸ்") ||
            text.includes("பணம் எடுக்கணும்") ||
            text.includes("பணம் எடுக்க வேண்டும்") ||
            text.includes("பணம் எடுக்க")
        ) {

            // If user says "பணம் எடுக்கணும்", demo can continue
            // according to the requested banking flow.
            await handleBalanceOrWithdrawal(text);

        } else if (
            text.includes("withdraw") ||
            text.includes("cash") ||
            text.includes("withdrawal") ||
            text.includes("பணம்")
        ) {

            await withdrawalProcess();

        } else {

            await speak(
                "மன்னிக்கவும். Balance Enquiry அல்லது Cash Withdrawal என்று கூறவும்."
            );

            await sleep(1500);
            startVoiceRecognition();
        }
    };

    recognition.onerror = () => {
        setTimeout(() => startVoiceRecognition(), 1000);
    };

    recognition.onend = () => {};

    try {
        recognition.start();
    } catch (error) {
        console.log(error);
    }
}

async function handleBalanceOrWithdrawal(text) {

    if (
        text.includes("balance") ||
        text.includes("இருப்பு") ||
        text.includes("பேலன்ஸ்")
    ) {
        await balanceProcess();
        return;
    }

    // The requested example phrase "எனக்கு பணம் எடுக்கணும்"
    // is treated as withdrawal request.
    await withdrawalProcess();
}

async function balanceProcess() {

    currentStep = "balance";

    if (recognition) {
        try {
            recognition.stop();
        } catch {}
    }

    processStatus.textContent = "Checking Balance";
    sessionStatus.textContent = "Balance Enquiry";

    await speak(
        "சரி, உங்கள் கணக்கு இருப்பை சரிபார்க்கிறேன்."
    );

    await sleep(2000);

    // Demo bank balance
    const balance = 12500;

    processMessage.textContent =
        `Bank System: Balance ₹${balance.toLocaleString("en-IN")}`;

    await sleep(1000);

    await speak(
        "உங்கள் கணக்கு இருப்பு ரூபாய் பன்னிரெண்டாயிரத்து ஐநூறு."
    );

    await sleep(2000);

    await speak(
        "உங்கள் வங்கி கணக்கு புத்தகத்தை எடுத்துக் கொள்ளவும்."
    );

    await sleep(2000);

    clearSession();
}

async function withdrawalProcess() {

    currentStep = "withdrawal";

    if (recognition) {
        try {
            recognition.stop();
        } catch {}
    }

    processStatus.textContent = "Withdrawal Request";

    await speak(
        "சரி, உங்களுக்கு எவ்வளவு பணம் எடுக்க விரும்புகிறீர்கள்?"
    );

    await sleep(1000);

    listenForAmount();
}

function listenForAmount() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        useDemoAmount();
        return;
    }

    const amountRecognition = new SpeechRecognition();

    amountRecognition.lang = "ta-IN";
    amountRecognition.continuous = false;
    amountRecognition.interimResults = false;

    amountRecognition.onresult = async (event) => {

        const text = event.results[0][0].transcript.toLowerCase();

        let amount = extractAmount(text);

        if (!amount) {
            amount = 5000;
        }

        await confirmAmount(amount);
    };

    amountRecognition.onerror = async () => {
        await useDemoAmount();
    };

    try {
        amountRecognition.start();
    } catch {
        useDemoAmount();
    }
}

function extractAmount(text) {

    if (
        text.includes("ஐயாயிரம்") ||
        text.includes("ஐந்து ஆயிரம்") ||
        text.includes("5000")
    ) {
        return 5000;
    }

    if (
        text.includes("ஆயிரம்") ||
        text.includes("1000")
    ) {
        return 1000;
    }

    if (
        text.includes("இரண்டாயிரம்") ||
        text.includes("2000")
    ) {
        return 2000;
    }

    return null;
}

async function useDemoAmount() {
    await sleep(500);
    await confirmAmount(5000);
}

async function confirmAmount(amount) {

    withdrawAmount.textContent =
        `₹${amount.toLocaleString("en-IN")}`;

    await sleep(700);

    await speak(
        `நீங்கள் ${amount.toLocaleString("en-IN")} ரூபாய் எடுக்க விரும்புகிறீர்களா?`
    );

    await sleep(1000);

    listenForConfirmation(amount);
}

function listenForConfirmation(amount) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        confirmWithdrawal(amount);
        return;
    }

    const confirmRecognition = new SpeechRecognition();

    confirmRecognition.lang = "ta-IN";
    confirmRecognition.continuous = false;
    confirmRecognition.interimResults = false;

    confirmRecognition.onresult = async (event) => {

        const text = event.results[0][0].transcript.toLowerCase();

        if (
            text.includes("ஆமா") ||
            text.includes("ஆமாம்") ||
            text.includes("ஆம்") ||
            text.includes("yes") ||
            text.includes("ஆம")
        ) {
            await confirmWithdrawal(amount);
        } else {

            await speak(
                "சரி. கோரிக்கை நிறுத்தப்பட்டுள்ளது."
            );

            await sleep(1500);

            clearSession();
        }
    };

    confirmRecognition.onerror = async () => {
        await confirmWithdrawal(amount);
    };

    try {
        confirmRecognition.start();
    } catch {
        confirmWithdrawal(amount);
    }
}

async function confirmWithdrawal(amount) {

    processStatus.textContent = "Request Sent";

    customerName.textContent =
        `${customer} ✓ Verified`;

    withdrawAmount.textContent =
        `₹${amount.toLocaleString("en-IN")}`;

    withdrawRequest.classList.remove("hidden");

    processMessage.textContent =
        "Withdrawal request sent to Cashier / Bank Staff.";

    await speak(
        `சரி, உங்களுக்கு ${amount.toLocaleString("en-IN")} ரூபாய் பணம் எடுப்பதற்கான கோரிக்கையை பதிவு செய்கிறேன்.`
    );

    await sleep(2000);

    // Demo cashier request
    await sendCashierRequest(amount);

    await speak(
        `உங்கள் ${amount.toLocaleString("en-IN")} ரூபாய் பணம் எடுக்கும் கோரிக்கை cashier-க்கு அனுப்பப்பட்டுள்ளது. தயவுசெய்து cashier-ஐ அணுகி பணத்தை பெற்றுக் கொள்ளவும்.`
    );

    await sleep(2000);

    await speak(
        "உங்கள் வங்கி கணக்கு புத்தகத்தை எடுத்துக் கொள்ளவும்."
    );

    await sleep(2000);

    clearSession();
}

async function sendCashierRequest(amount) {

    const request = {
        type: "Withdrawal Request",
        customer: customer,
        verified: true,
        amount: amount,
        status: "Request Sent",
        time: new Date().toISOString()
    };

    localStorage.setItem(
        "latestWithdrawalRequest",
        JSON.stringify(request)
    );

    processMessage.textContent =
        "✓ Cashier request created successfully.";
}

function clearSession() {

    sessionStarted = false;
    customerVerified = false;
    currentStep = "idle";

    speechSynthesis.cancel();

    if (recognition) {
        try {
            recognition.stop();
        } catch {}
    }

    withdrawRequest.classList.add("hidden");

    setStep(faceStatus, false, "Waiting");
    setStep(passbookStatus, false, "Waiting");
    setStep(fingerprintStatus, false, "Waiting");

    personDetected.style.display = "none";
    faceFrame.style.display = "none";

    processStatus.textContent = "Session Cleared";
    sessionStatus.textContent = "Ready for next customer";

    welcomeTitle.textContent = "வணக்கம்!";

    setMessage("அடுத்த customer-க்காக காத்திருக்கிறது...");

    setTimeout(() => {

        sessionStatus.textContent = "Camera Active";

        setTimeout(() => {

            personDetected.style.display = "block";
            faceFrame.style.display = "block";

            setStep(faceStatus, true, "Detected");

            beginSession();

        }, 1500);

    }, 3000);
}

/* Manual service buttons are kept only as backup.
   Main flow starts automatically after person detection. */

balanceBtn.addEventListener("click", () => {
    if (customerVerified) {
        balanceProcess();
    }
});

withdrawBtn.addEventListener("click", () => {
    if (customerVerified) {
        withdrawalProcess();
    }
});

/* START */

window.addEventListener("load", () => {

    processStatus.textContent = "System Ready";
    sessionStatus.textContent = "Starting Camera...";

    setTimeout(() => {
        startCamera();
    }, 700);

});