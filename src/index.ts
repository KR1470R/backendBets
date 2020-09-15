import "reflect-metadata";
import {createConnection, Index, Column} from "typeorm";
import { connect } from "net";
import * as express from "express";
import * as ejs from "ejs";
import * as bodyParser from "body-parser"
import {User} from "./entity/User";
import {Bet} from "./entity/Bet";
import {Streamer} from "./entity/Streamer";
import {Game} from "./entity/Game"
import {Token} from "./entity/Token"
import * as nodemailer from "nodemailer"
import * as uuid from "uuid"
import * as dotenv from "dotenv"
dotenv.config()

// methods 
createConnection().then(async connection => {

    const app = express()

    app.set('views', __dirname + '/views');
    app.engine('html', ejs.renderFile);
    app.use(express.json())

    app.get("/home", (req, res) => {
        res.render("index.html")
    })

    enum statusStreamer {
        takeBet = "Accepts bets",
        takeEnded = "Reception completed",
        offline = "Offline"
    }

    enum statusBet {
        victory = "Victory",
        defeat = "Defeat"
    }

    /**
     * Register method.
     */
    app.post("/register", async (req, res) => {
        if ( await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", { email: req.body.email }).getOne() ) {
            return res
            .status(500) 
            .send("Email is busy, please enter another email!")
        } else {
            const user = new User()
            user.email = req.body.email
            user.password = req.body.password
            user.isAdmin = "false"
            user.idStreamer = null
            user.balance = 0.00
            connection.manager.save(user)
        }
    })

    /**
     * Check password method. 
     */
    app.post("/check_pass", async (req,res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        // if email and password is available in date base - return false, else - return true
        if (columnUser.email === req.body.email && columnUser.password === req.body.password) {
            res.send(false)
        } else {
            res.send(true)
        }
    })

    /**
     * Send message to mail
     */
    app.post("/send_message_email", async (req, res) => {
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            requireTLS: true,
            secure: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }            
        })

        let mailOptions = {
            from: process.env.EMAIl,
            to: req.body.emailReceiver,
            subject: "Recover password XBET",
            text: "link for change password"
        }

        transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
                return res 
                .status(500)
                .send(err)  
            }
            const token = new Token()
            token.token = uuid.v4()
            connection.manager.save(token)
            console.log("Email sent and token was registered!")
        })      
    })

    /**
     * Change password
     */
    app.post("/change_pass", async (req,res) => {
        const columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()

        if (columnUser) {
            const columnToken = await connection.getRepository(Token).createQueryBuilder("token").where("token.token = :token", {token: req.body.token}).getOne()
            if (columnToken) {
                const qb = connection.createQueryBuilder();
                await qb
                .update(User)
                .set({password: () => qb.escape(req.body.password)})
                .where("user.email = :email", {email: req.body.email})
                .execute()

                await connection
                .createQueryBuilder()
                .delete()
                .from(Token)
                .where("token = :token", {token: req.body.token})
                .execute();
                
                console.log(`Password changed for <${req.body.email}>`)
            } else {
                return res 
                .status(404)
                .send(`Token not found!`)  
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`)     
        }
    })

    
    /**
     * Add Game
     */
     app.post("/add_game", async (req,res) => {
        const columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.isAdmin === "true") {
                if (columnUser.password === req.body.password) {
                    let game = new Game()
                    game.name = req.body.name
                    connection.manager.save(game)
                    
                } else {
                    return res 
                    .status(500)
                    .send(`Invalid password!`)  
                }
            } else {
                return res 
                .status(403)
                .send(`User <${req.body.email}> is not admin!`)  
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`)  
        }
     })
     
     /**
      * Remove game
      */
      app.post("/remove_game", async (req, res) => {
        const columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.isAdmin === "true") {
                if (columnUser.password === req.body.password) {
                    let columnGame = await connection.getRepository(Game).createQueryBuilder("game").where("game.id = :id", {id: req.body.id}).getOne()
                    
                    if (columnGame) {
                        await connection
                        .createQueryBuilder()
                        .delete()
                        .from(Game)
                        .where("id = :id", {id: req.body.id})
                        .execute();
                    } else {
                        return res 
                        .status(404)
                        .send(`Game not found!`)  
                    }

                } else {
                    return res 
                    .status(500)
                    .send(`Invalid password!`)  
                }
            } else {
                return res 
                .status(403)
                .send(`User <${req.body.email}> is not admin!`)  
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`)  
        }
      })


    /**
     * Add Streamer
     */
    app.post("/add_streamer", async (req, res) => {
        let columnAdmin = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.emailAdmin}).getOne()
        if (columnAdmin) {
            if (columnAdmin.isAdmin === "true") {
                if (columnAdmin.password === req.body.passwordAdmin){
                    if (await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.emailStreamer}).getOne()) {
                        const streamer = new Streamer()
                        streamer.idGame = req.body.idGame
                        streamer.usernameTwitch = req.body.usernameTwitch
                        streamer.currentStatus = statusStreamer.offline
                        await connection.manager.save(streamer)
    
                        let columnStreamer = await connection.getRepository(Streamer).createQueryBuilder("streamer").where("streamer.usernameTwitch = :usernameTwitch", {usernameTwitch: req.body.usernameTwitch}).getOne()

                        const qb = connection.createQueryBuilder();
                        await qb
                            .update(User)
                            .set({ idStreamer: () => qb.escape(columnStreamer.id.toString()) })
                            .where("user.email = :email", { email: req.body.emailStreamer})
                            .execute();
                    } else {
                        return res
                        .status(404) 
                        .send(`User <${req.body.emailStreamer}> not found!`)
                    }

                } else {
                    return res
                    .status(500) 
                    .send("Password invalid!")
                }
            } else {
                return res
                .status(403) 
                .send("Permission denied!")
            }
        } else {
            return res
            .status(404)
            .send(`User admin <${req.body.emailAdmin}> not found!`)
        }

    })
    
    /**
     * Remove streamer
     */
     app.post("/remove_streamer", async (req,res) => {
        let columnAdmin = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.emailAdmin}).getOne()
        if (columnAdmin) {
            if (columnAdmin.isAdmin === "true") {
                if (columnAdmin.password === req.body.passwordAdmin){
                    let columnStreamer = await connection.getRepository(Streamer).createQueryBuilder("streamer").where("streamer.id = :id", {id: req.body.idStreamer}).getOne()
                    await connection
                    .createQueryBuilder()
                    .delete()
                    .from(Streamer)
                    .where("id = :id", {id: columnStreamer.id})
                    .execute();
                    
                    const qb = connection.createQueryBuilder();
                    await qb
                        .update(User)
                        .set({ idStreamer: () => "null" })
                        .where("user.idStreamer = :idStreamer", { idStreamer: req.body.idStreamer})
                        .execute();
                } else {
                    return res
                    .status(500) 
                    .send("Password invalid!")
                }
            } else {
                return res
                .status(403) 
                .send("Permission denied!")
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.emailAdmin}> not found!`)
        }
     })



    /**
     * Create bet
     */
    app.use("/create_bet", async (req, res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne() 
        if (columnUser.password === req.body.password){
            if (columnUser.balance >= req.body.sum){
                const bet = new Bet()
                bet.idUser = req.body.idUser
                bet.idStreamer = req.body.idStreamer
                bet.sum = req.body.sum
                bet.isCompleted = "false"
                bet.type = req.body.type
                connection.manager.save(bet)
            } else {
                return res
                .status(403)
                .send("Not enough money!")
            }
        } else {
            return res
            .status(500) 
            .send("Invalid password!")    
        }
    })
    
    /**
     * Bet history
     */
    app.post("/bet_history", async (req, res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        
        if (columnUser.password === req.body.password){
            
            let columnBet = await connection.getRepository(Bet).createQueryBuilder("bet").where("bet.idUser = :idUser", {idUser: columnUser.id}).getMany()
            return res.send(columnBet)
        } else {
            return res
            .status(500) 
            .send("Invalid password!")  
        }  
    })

     /**
      * Take bet
      */
     app.post("/take_bet", async (req,res) => {
         let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
         if (columnUser) {
            if (columnUser.idStreamer) {
                const qb = connection.createQueryBuilder();
                await qb
                    .update(Streamer)
                    .set({ currentStatus: () => qb.escape(statusStreamer.takeBet) })
                    .where("streamer.id = :id", { id: columnUser.idStreamer})
                    .execute();

            } else {
                return res 
                .status(500)
                .send(`User <${req.body.email}> is not streamer!`) 
            }
         } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`) 
         }
     })

     /**
      * Stop take bet
      */
     app.post("/stop_take_bet", async (req, res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.idStreamer) {
                const qb = connection.createQueryBuilder();
                await qb
                    .update(Streamer)
                    .set({ currentStatus: () => qb.escape(statusStreamer.takeEnded) })
                    .where("streamer.id = :id", { id: columnUser.idStreamer})
                    .execute();

            } else {
                return res 
                .status(500)
                .send(`User <${req.body.email}> is not streamer!`) 
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`) 
        }
     })

     /**
      * Victory
      */
     app.post("/victory", async (req, res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.idStreamer) {
                let columnBet = await connection.getRepository(Bet).createQueryBuilder("bet").where("bet.type = :type", {type: statusBet.victory}).getMany()
                console.log(columnBet)
                for (let item of columnBet) {
                    let columntUser = await connection.getRepository(User).createQueryBuilder("user").where("user.id = :id", {id: item.idUser}).getMany()
                    const qb = connection.createQueryBuilder();
                    await qb
                    .update(User)
                    .set({ balance: () => qb.escape((parseInt(columnUser.balance) + parseInt(item.sum)).toString()) })
                    .where("user.id = :id", { id: item.idUser})
                    .execute();
                }

            } else {
                return res 
                .status(500)
                .send(`User <${req.body.email}> is not streamer!`) 
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`) 
        }
     })

    /**
     * Defeat
     */
    app.post("/defeat", async (req, res) => {
        let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.idStreamer) {
                let columnBet = await connection.getRepository(Bet).createQueryBuilder("bet").where("bet.type = :type", {type: statusBet.defeat}).getMany()
                console.log(columnBet)
                for (let item of columnBet) {
                    let columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.id = :id", {id: item.idUser}).getMany()
                    const qb = connection.createQueryBuilder();
                    await qb
                    .update(User)
                    .set({ balance: () => qb.escape((parseInt(columnUser.balance) + parseInt(item.sum)).toString()) })
                    .where("user.id = :id", { id: item.idUser})
                    .execute();
                }

            } else {
                return res 
                .status(500)
                .send(`User <${req.body.email}> is not streamer!`) 
            }
        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`) 
        }  
    })

    /**
     * Cancel bet
     */
    app.post("/cancel_bet", async (req, res) => {
        const columnUser = await connection.getRepository(User).createQueryBuilder("user").where("user.email = :email", {email: req.body.email}).getOne()
        if (columnUser) {
            if (columnUser.password === req.body.password) {
                if (columnUser.idStreamer) {
                    await connection
                    .createQueryBuilder()
                    .delete()
                    .from(Bet)
                    .where("idStreamer = :idStreamer AND isCompleted = :isCompleted", {idStreamer: columnUser.idStreamer,isCompleted: "false"})
                    .execute();
                } else {
                    return res 
                    .status(403)
                    .send(`User <${req.body.email}> is not streamer!`) 
                }
            } else {
                return res 
                .status(500)
                .send(`Invalid password!`)  
            }

        } else {
            return res 
            .status(404)
            .send(`User <${req.body.email}> not found!`)  
        }
    })



    app.listen(8000, (data) => {
        console.log("Server listening on localhost:8000...")
    })
})