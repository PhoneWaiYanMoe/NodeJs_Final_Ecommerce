// Hardcoded admin credentials (temporary)
const ADMIN_USERNAME = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Middleware to check if the user is an admin
export const authenticateAdmin = (req, res, next) => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    // Expecting "Basic <base64-encoded-username:password>"
    const [type, credentials] = authHeader.split(' ');
    if (type !== 'Basic') {
        return res.status(401).json({ message: 'Invalid authentication type, expected Basic' });
    }

    // Decode the base64 credentials
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    // Check if the credentials match the hardcoded admin credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Credentials are valid, proceed to the next middleware/controller
        next();
    } else {
        return res.status(403).json({ message: 'Invalid username or password' });
    }
};