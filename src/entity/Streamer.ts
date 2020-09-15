import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Streamer {

  @PrimaryGeneratedColumn()
  id: number;
  
  @Column('text',{nullable:true})
  idGame: number;

  @Column('text',{nullable:true})
  usernameTwitch: string;

  @Column('text',{nullable:true})
  currentStatus: string;

}