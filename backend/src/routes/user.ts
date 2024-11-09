import {Hono} from "hono";
import {PrismaClient} from "@prisma/client/edge";
import {withAccelerate} from "@prisma/extension-accelerate";
import {sign} from "hono/jwt";
import {signinInput, signupInput} from "../zod";

export const userRouter = new Hono<
    {
        Bindings: {
            DATABASE_URL: string,
            JWT_SECRET: string
        }
    }>();


userRouter.post('/signup', async (c) => {
    try {
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL,
        }).$extends(withAccelerate())
        const {success} = signupInput.safeParse(await c.req.json())
        if (!success) {
            c.status(411)
            return c.json({
                message: 'Invalid input'
            })
        }
        const body = await c.req.json();
        const user = await prisma.user.create({
            data: {
                email: body.email,
                password: body.password,
            },
        })
        const token = await sign({id: user.id}, c.env.JWT_SECRET)
        return c.json({
            jwt: token
        })
    } catch (error) {
        console.error(error)
        return c.text('Internal Server Error', 500)
    }
})

userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const {success} = signinInput.safeParse(await c.req.json())
    if (!success) {
        c.status(411)
        return c.json({
            message: 'Invalid input'
        })
    }
    const body = await c.req.json();
    const user = await prisma.user.findUnique({
        where: {
            email: body.email,
            password: body.password
        },
    });

    if (!user) {
        return c.text('Unauthorized', 401)
    }
    const token = await sign({id: user.id}, c.env.JWT_SECRET)
    return c.json({
        jwt: token
    })
})
