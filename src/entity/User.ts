import {Entity, PrimaryGeneratedColumn, Column, ViewEntity} from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: string;

    @Column('text',{nullable:true})
    email: string;

    @Column('text',{nullable:true})
    password: string;

    @Column('text',{nullable:true})
    isAdmin: string;

    @Column('text',{nullable:true})
    idStreamer: string | null;

    @Column('text',{nullable:true})
    balance: number;
}