import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import dayjs from "dayjs";
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/pt-br'
import nodemailer from 'nodemailer'
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";


dayjs.locale('pt-br')
dayjs.extend(localizedFormat)


export async function createTrip(app: FastifyInstance){


    // Validação de dados
    app.withTypeProvider<ZodTypeProvider>().post('/trips',{
        schema: {
            body: z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string().email(),
                emails_to_invite: z.array(z.string().email()),
            })
        }
    } , async (request) => {
        
        const {destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite} = request.body

        // verifica se a data de inicio está antes da data atual
        if (dayjs(starts_at).isBefore(new Date())){
            throw new Error('Invalid trip start date')
        }

        // Verifica se a data do fim se encontra antes do inicio da data da trip
        if (dayjs(ends_at).isBefore(starts_at)){
            throw new Error('Invalid trip end date')
        }

        // Cria a viagem
        const trip = await prisma.trip.create({
            data: {
                destination,
                starts_at,
                ends_at,
                participants: {
                    createMany: {
                        data: [
                            {
                            name: owner_name,
                            email: owner_email,
                            is_owner: true,
                            is_confirmed: true,
                        },
                        ...emails_to_invite.map(email => {
                            return { email } 
                        })
                    ]
                }
                }
            }
        })

        // formatar data

        const formattedStartDate = dayjs(starts_at).format('LL')
        const formattedEndDate = dayjs(ends_at).format('LL')

        const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`


        const mail = await getMailClient()

        // Envio do e-mail
        const message = await mail.sendMail({
            from: {
                name: "Equipe plann.er",
                address: "oi@plann.er",
            },
            to: {
                name: owner_name,
                address: owner_email,
            },

            subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
            html: `
                <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                    <p> Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong> ${formattedStartDate} a ${formattedEndDate}</strong>.</p>
                    <p></p>
                    <p> Para continuar sua viagem, clique no link abaixo: </p>
                    <p></p>
                    <p>
                        <a href="${confirmationLink}">Confirmar viagem</a>
                    </p>
                    <p></p>
                    <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
                </div>
            `.trim()
        })

        console.log(nodemailer.getTestMessageUrl(message))

        return { tripId: trip.id }
    })
}
