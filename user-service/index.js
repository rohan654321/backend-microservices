const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('../shared/database');
const { authenticateToken } = require('./middleware/auth')

const app = express()

app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

app.get('/', authenticateToken, async(req , res) =>{
    try{
        const user = await database.query(
            'SELECT id, email, name, created_at, updated_at, FROM users'
        );
        res.json(users);
    }catch(error){
        console.error('Get users error: ', error);
        res.status(500).json({error: 'Internal server error'})
        
    }
})

//get user by id (protected)

app.get('/:id', authenticateToken, async(req , res) => {
    try{
        const userId = req.params.id;
        const users = await database.query(
            'SELECT id, email, name, created_at, update_at FROM users WHERE id = ?'
            [userId]
        );
        if (users.length === 0){
            return res.status(404).json({error: 'User not found'});
        }
        res.json(user[0]);
    }catch(error){
        console.error('Get user error: ', error);
        res.status(500).json({error: 'Internal server error'})
    }
});

//update user (protected)
app.put('/:id', authenticateToken, async(req, res)=>{
    try{
        const userId = req.params.id;
        const { name, email } = req.body;

        const existingUser = await database.query('SELECT id FROM users WHERE id = ?', [userId]);
        if(existingUser.length === 0){
            return res.status(404).json({error: 'user not found'});
        }
        await database.query(
            'UPDATE users SET name = ? , email = ?, WHERE id = ?',
            [name, email, userId]
        );
        const updatedUser = await database.query(
            'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?', [userId]
        );
        res.json({
            message: 'User updated successfully',
            user: updateUser[0]
        });
    }catch(error){
        console.error('Update user error: ', error);
        res.status(500).json({error: 'Internal server error'})
    }
})

//Delete user
app.delete('/:id', authenticateToken, async(req, res)=>{
    try{
        const userId = req.params.id;

        const existingUser = await database.query('SELECT id FROM users WHERE id = ?', [userId]);
        if(existingUser.length === 0){
            return res.status(404).json({error: 'User not found '});
        }

        await database.query('DELETE FROM users WHERE id = ? ', [userId]);
        res.json({message: 'user deleted successfully'});
    }catch(error){
        console.error('Delete user error: ', error)
        res.status(500).json({error: 'Internal server error'})
    }
})
//Health check

app.get('/health', (req,res) => {
    res.status(200).json({status: 'User Services is running'});
})
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`User Services running on port ${PORT}`);
});