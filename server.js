const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 1432;

// Set up body parser and static file serving
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

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
            { header: 'Password', key: 'password', width: 30 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Date of Birth', key: 'dob', width: 15 },
            { header: 'Phone Number', key: 'phone', width: 20 },
            { header: 'File', key: 'file', width: 40 },
            { header: 'Category', key: 'category', width: 30 } // Added category column
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
            worksheet.addRow([username, gmail, password, null, null, null, null, null]);
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

// Route for handling profile upload
app.post('/upload-profile', upload.single('file'), async(req, res) => {
    const { name, dob, phone, category } = req.body;
    const file = req.file;

    try {
        const { workbook, worksheet } = await getWorksheet();

        // Find the last row with partial data (username, gmail, password)
        let lastRow;
        worksheet.eachRow((row, rowNumber) => {
            if (row.values[1] && row.values[2] && row.values[3] && !row.values[4]) {
                lastRow = row;
            }
        });

        if (lastRow) {
            // Ensure the column indices are within the valid range
            lastRow.getCell(4).value = name; // Column D for 'name'
            lastRow.getCell(5).value = dob; // Column E for 'dob'
            lastRow.getCell(6).value = phone; // Column F for 'phone'
            lastRow.getCell(7).value = file.filename; // Column G for 'file'
            lastRow.getCell(8).value = category; // Column H for 'category'
            await workbook.xlsx.writeFile(excelFilePath); // Save changes to the file
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'No matching user found for profile update' });
        }
    } catch (error) {
        console.error('Error saving profile data:', error);
        res.json({ success: false, message: 'Error saving profile data' });
    }
});

// Route for counting total clients
app.get('/total-clients', async(req, res) => {
    try {
        const { worksheet } = await getWorksheet();
        let clientCount = 0;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Assuming the first row is the header
                clientCount++;
            }
        });

        res.json({ totalClients: clientCount });
    } catch (error) {
        console.error('Error reading the Excel file:', error);
        res.json({ success: false, message: 'Error reading the Excel file' });
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
// Route for counting total clients
app.get('/total-clients', async(req, res) => {
    try {
        const { worksheet } = await getWorksheet();
        let clientCount = 0;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Assuming the first row is the header
                clientCount++;
            }
        });

        res.json({ totalClients: clientCount });
    } catch (error) {
        console.error('Error reading the Excel file:', error);
        res.json({ success: false, message: 'Error reading the Excel file' });
    }
});