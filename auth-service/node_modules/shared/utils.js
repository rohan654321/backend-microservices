const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class Utils{
    static async hashPassword(password){
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
    static async comparePassword(password, hash){
        return await bcrypt.compare(password, hash);
    }
    static generateToken(payload){
        return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {expiresIn: '24h'})
    }
    static verifyPassword(token){
        return jwt.verify(token, process.env.JWT_SECRET || 'secret')
    }
    static validateEmail(email){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email)
    }
}
module.exports = Utils;