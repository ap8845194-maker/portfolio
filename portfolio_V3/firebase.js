import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyDxW_1ovt-udydq2ysmaA2HcuaE7590A24",
  authDomain: "ayush-portfolio-v3.firebaseapp.com",
  projectId: "ayush-portfolio-v3",
  storageBucket: "ayush-portfolio-v3.firebasestorage.app",
  messagingSenderId: "1024873613359",
  appId: "1:1024873613359:web:72f2881d5fe4750ac39eda"
};


const app = initializeApp(firebaseConfig);


const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


export {
    app,
    auth,
    db,
    storage
};