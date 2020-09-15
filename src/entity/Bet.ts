import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Bet {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text',{nullable:true})
  idUser: number;

  @Column('text',{nullable:true})
  idStreamer: number;

  @Column('text',{nullable:true})
  sum: number;

  @Column('text',{nullable:true})
  type: string;

  @Column('text',{nullable:true})
  isCompleted: string;

}