const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('../shared/database')
const utils = require('../shared/utils')

const app = express()

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

//Initialize Database
async function initializeDatabase() {
    try{
        await database.query(`
            CREATE TABLE IF NOT EXIST user(
              id INT AUTO_INCREMENT PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRET_TIMESTAMP
            )
         `);
         console.log('database created table');
    }catch(err){
        console.error('database not insert data')
    }


    //signup

    app.post('/signup', async(req , res) => {
        try{
            const {email, password, name} = req.body;

            if(!email || !password || !name){
                return res.status(400).json({error: 'All fields are required'})
                
            }
            if(!utils.validateEmail(email)){
                return res.status(400).json({error: 'Invalid email format'})
            }
            if(password.length < 6){
                return res.status(400).json({error: 'Password must be at least 6 characters'})
            }
            const existingUser = await database.query('SELECT id FROM users WHERE email = ?', [email]);
            if(existingUser.length > 0){
                return res.status(409).json({error: 'user already exists'});
            }
            const hashPassword = await utils.hashPassword(password);
            const result = await database.query(
                'INSERT INTO users(email, password, name) VALUE(?, ?, ?)',
                [email, hashPassword, name]
            );
            const token = utils.generateToken({userId: result.insertId, email})

            res.status(200).json({message: 'User created successfully', token, user: {id: result.insertId, email, name}});
        }catch(error){
            console.error('signup error', error);
            res.status(500).json({error: 'Internal Server Error'})
        }
    });
}

//signin

app.post('/signin', async(req, res)=>{
    try{
        const{ email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({error: 'Email and Password needed'})
        }
        //Find USer
        const users = await database.query('SELECT * FROm users WHERE email = ?', [email]);
        if(users.length === 0){
            return res.status(401).json({error: 'Invalid credentials'});
        }
        const user = users[0];
        const isValidPassword = await utils.comparePassword(password, user.password)
        if(!isValidPassword){
            return res.status(401).json({error: 'Invalid credentials'});
        }
        const token = utils.generateToken({userId: user.id, email: user.email});
        res.json({
            message: 'sign in successful',
            token,
            user: {id:user.id, email: user.email, name: user.name}
        });
    }catch(error){
        console.error('signin error: ', error);
        res.status(500).json({error: 'Internal server error'})
    }
})

//verify Token
app.post('/verify', (req, res)=>{
    try{
        const token = req.headers.authorization?.split(' ')[1];
        if(!token){
            return res.status(401).json({error: 'No token provided'});
        }
        const decoded = utils.verifyToken(token);
        res.json({valid: true, user: decoded});
    }catch(error){
        res.status(401).json({valid: false, error: 'Invalid token'})
    }
});

//health
app.get('/health',(req, res)=>{
    res.status(200).json({status: 'Auth Service is running'})
})

const PORT = process.env.PORT || 3001;

initializeDatabase().then(()=>{
    app.listen(PORT, () => {
        console.log(`Auth Service running on port ${PORT}`);
        
    })
})