const express = require('express');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to the Excel file
const excelFilePath = path.join(__dirname, 'users.xlsx');

// Function to get workbook and worksheet
const getWorksheet = async() => {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(excelFilePath)) {
        await workbook.xlsx.readFile(excelFilePath);
    } else {
        // Create a new workbook if the file doesn't exist
        const worksheet = workbook.addWorksheet('Users');
        worksheet.columns = [
            { header: 'Username', key: 'username', width: 30 },
            { header: 'Gmail', key: 'gmail', width: 30 },
            { header: 'Password', key: 'password', width: 30 }
        ];
        await workbook.xlsx.writeFile(excelFilePath);
    }
    const worksheet = workbook.getWorksheet('Users');
    return { workbook, worksheet };
};

// Route for handling signup
app.post('/signup', async(req, res) => {
    const { username, gmail, password } = req.body;

    try {
        const { workbook, worksheet } = await getWorksheet();

        // Check if the username or email already exists
        let userExists = false;
        worksheet.eachRow((row, rowNumber) => {
            const [storedUsername, storedGmail] = row.values.slice(1);
            if (storedUsername === username || storedGmail === gmail) {
                userExists = true;
            }
        });

        if (userExists) {
            res.json({ success: false, message: 'Username or Email already exists' });
        } else {
            worksheet.addRow([username, gmail, password]);
            await workbook.xlsx.writeFile(excelFilePath); // Save changes to the file
            res.json({ success: true });
        }
    } catch (error) {
        console.error('Error saving user data:', error);
        res.json({ success: false, message: 'Error saving user data' });
    }
});

// Route for handling login
app.post('/login', async(req, res) => {
    const { usernameOrGmail, password } = req.body;

    try {
        const { worksheet } = await getWorksheet();
        let userFound = false;

        worksheet.eachRow((row, rowNumber) => {
            const [username, gmail, storedPassword] = row.values.slice(1);
            if ((username === usernameOrGmail || gmail === usernameOrGmail) && storedPassword === password) {
                userFound = true;
            }
        });

        if (userFound) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid username/email or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.json({ success: false, message: 'Error logging in' });
    }
});

// Define a route for the root URL ("/") to serve signup.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Start server
app.listen(PORT, async() => {
    console.log(`Server running at http://localhost:${PORT}`);
    await getWorksheet(); // Ensure the Excel file is initialized on server start
});