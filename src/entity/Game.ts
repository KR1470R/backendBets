import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Game {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text',{nullable:true})
  name: string;
  
}