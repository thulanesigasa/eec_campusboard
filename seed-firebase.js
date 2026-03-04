const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAL6W3lA1fe3-0J1-LKFpi8QLQLlDk97sU",
    authDomain: "eec-campusboard.firebaseapp.com",
    projectId: "eec-campusboard",
    storageBucket: "eec-campusboard.firebasestorage.app",
    messagingSenderId: "1078991146377",
    appId: "1:1078991146377:web:7770209f734ca10cd1e558",
    measurementId: "G-QQZ8CDB8J1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const schools = [
    {
        name: "Springs Campus",
        location: "Ekurhuleni, Gauteng"
    },
    {
        name: "Benoni Campus",
        location: "Ekurhuleni, Gauteng"
    },
    {
        name: "Daveyton Campus",
        location: "Ekurhuleni, Gauteng"
    },
    {
        name: "Kwa-Thema Campus",
        location: "Ekurhuleni, Gauteng"
    },
    {
        name: "Artisan Skills Development Centre",
        location: "Ekurhuleni, Gauteng"
    },
    {
        name: "Brakpan Campus",
        location: "Ekurhuleni, Gauteng"
    }
];

async function seedSchools() {
    console.log("Seeding campuses into Firestore...");
    try {
        const schoolsRef = collection(db, 'schools');

        for (const school of schools) {
            const newDocRef = doc(schoolsRef);
            await setDoc(newDocRef, {
                name: school.name,
                location: school.location,
                created_at: new Date().toISOString()
            });
            console.log(`Added campus: ${school.name}`);
        }

        console.log("Successfully seeded all EEC campuses!");
    } catch (error) {
        console.error("Error seeding campuses:", error);
    }
}

seedSchools().then(() => process.exit(0));
