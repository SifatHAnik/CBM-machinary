import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD71q2-c7u7Jmptot-4sRd3scVe3FpzxFs",
    authDomain: "cbm-machinery.firebaseapp.com",
    projectId: "cbm-machinery",
    storageBucket: "cbm-machinery.firebasestorage.app",
    messagingSenderId: "532789850457",
    appId: "1:532789850457:web:a6f1c1c79dac768bcedc48"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail };