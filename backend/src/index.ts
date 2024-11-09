import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'

const app = new Hono<
    {
      Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
      }
    }>()
app.use('api/v1/*', async (c, next) => {
      const token = c.req.header('Authorization')?.split(" ")[1]

      if (!token) {
        return c.text('Unauthorized', 401)
      }
      const response = await verify(token, c.env.JWT_SECRET)
      if (!response) {
        return c.status(401)
      } else {
        await next()
      }
    }
)

app.post('/api/v1/signup', async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const body = await c.req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    })
    const token = await sign({ id: user.id }, c.env.JWT_SECRET)
    return c.json({
      jwt: token
    })
  } catch (error) {
    console.error(error)
    return c.text('Internal Server Error', 500)
  }
})
app.post('/api/v1/signin', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

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
  const token = await sign({ id: user.id }, c.env.JWT_SECRET)
  return c.json({
    jwt: token
  })
})

app.post('/api/v1/blog', (c) => {
  return c.text('create blog')
})

app.put('/api/v1/blog', (c) => {
  return c.text('update blog')
})

app.get('/api/v1/blog/:id', (c) => {
  return c.text(`get blog by id ${c.req.param('id')}`)
})

app.get('/api/v1/blog/bulk', (c) => {
  return c.text('get bulk blog')
})


export default app
