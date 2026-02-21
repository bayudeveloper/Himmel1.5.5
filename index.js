const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();
const fileUpload = require('express-fileupload');
app.use(fileUpload());
// Error handlers
process.on('uncaughtException', (err) => {
    console.error(chalk.bgRed.white(' Uncaught Exception: '), err);
});

process.on('unhandledRejection', (err) => {
    console.error(chalk.bgRed.white(' Unhandled Rejection: '), err);
});

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Static files
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Create temp directories for Vercel
const tmpDir = path.join('/tmp', 'downloads');
const uploadDir = path.join('/tmp', 'uploads');

if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Load settings
let settings = { apiSettings: { creator: "Himmel API" } };
try {
    const settingsPath = path.join(__dirname, './src/settings.json');
    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
} catch (err) {
    console.log(chalk.yellow('⚠️ Settings file not found, using default'));
}

// Response middleware
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings?.creator || "Bayu Official",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

// Load API Routes
console.log(chalk.cyan('\n📂 Loading API Routes...\n'));

let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');

try {
    if (fs.existsSync(apiFolder)) {
        fs.readdirSync(apiFolder).forEach((subfolder) => {
            const subfolderPath = path.join(apiFolder, subfolder);
            if (fs.statSync(subfolderPath).isDirectory()) {
                fs.readdirSync(subfolderPath).forEach((file) => {
                    const filePath = path.join(subfolderPath, file);
                    if (path.extname(file) === '.js') {
                        try {
                            const route = require(filePath);
                            if (typeof route === 'function') {
                                route(app);
                                totalRoutes++;
                                console.log(chalk.bgHex('#90EE90').hex('#333').bold(` ✅ ${subfolder}/${file}`));
                            } else {
                                console.log(chalk.bgYellow.hex('#333').bold(` ⚠️ ${subfolder}/${file} - not a function`));
                            }
                        } catch (err) {
                            console.log(chalk.bgRed.white(` ❌ ${subfolder}/${file} - ${err.message}`));
                        }
                    }
                });
            }
        });
    }
} catch (err) {
    console.error(chalk.bgRed.white(' Error reading API folder: '), err);
}

console.log(chalk.bgHex('#90EE90').hex('#333').bold(`\n✅ Load Complete! Total Routes: ${totalRoutes}\n`));

// Home page
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'api-page', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({
            name: "Himmel API",
            version: "1.5.5",
            status: "online",
            routes: totalRoutes
        });
    }
});

// 404 handler
app.use((req, res) => {
    const notFoundPath = path.join(__dirname, 'api-page', '404.html');
    if (fs.existsSync(notFoundPath)) {
        res.status(404).sendFile(notFoundPath);
    } else {
        res.status(404).json({
            status: false,
            error: "Endpoint not found"
        });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const errorPath = path.join(__dirname, 'api-page', '500.html');
    if (fs.existsSync(errorPath)) {
        res.status(500).sendFile(errorPath);
    } else {
        res.status(500).json({
            status: false,
            error: "Internal server error"
        });
    }
});

// For Vercel, don't use app.listen()
module.exports = app;