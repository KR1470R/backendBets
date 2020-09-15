import {Entity, PrimaryGeneratedColumn, Column, ViewEntity} from "typeorm";

@Entity()
export class Token {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('text',{nullable: true})
  token: string;
}