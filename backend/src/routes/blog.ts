import {Hono} from "hono";
import {verify} from 'hono/jwt'
import {PrismaClient} from "@prisma/client/edge";
import {withAccelerate} from "@prisma/extension-accelerate";
import {createBlogInput, updateBlogInput} from "../zod";

export const blogRouter = new Hono<
    {
        Bindings: {
            DATABASE_URL: string,
            JWT_SECRET: string
        },
        Variables: {
            userId: any;
        }
    }>();
blogRouter.use('/*', async (c, next) => {

    const token = c.req.header('Authorization')?.split(" ")[1] || "";

    if (!token) {
        return c.text('unauthorized', 401)
    }
    const payload = await verify(token, c.env.JWT_SECRET)

    if (payload) {
        c.set('userId', payload.id);
        await next();
    }
    return c.text('unauthorized', 401)
})

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const userId = c.get('userId');
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
    const {success} = createBlogInput.safeParse(await c.req.json())
    if (!success) {
        c.status(411)
        return c.json({
            message: 'Invalid input'
        })
    }
    const blog = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: userId
        }
    })

    return c.json({
        id: blog.id
    })
})

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
    const {success} = updateBlogInput.safeParse(await c.req.json())
    if (!success) {
        c.status(411)
        return c.json({
            message: 'Invalid input'
        })
    }
    const blog = await prisma.post.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content,
        }
    })

    return c.json({
        id: blog.id
    })
})

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const blogs = await prisma.post.findMany()

    return c.json({
        blogs
    })
})

blogRouter.get('/:id', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.post.findUnique({
            where: {
                id: c.req.param('id')
            }
        })

        if (!blog) {
            return c.text('not found', 404)
        }

        return c.json(blog)
    } catch (error) {
        console.error(error)
        return c.text("Could not fetch blog", 500)
    }

})


