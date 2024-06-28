import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/extension";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { createBlogInput,updateBlogInput } from "@shubhanshu5320/medium-common";
export const blogRouter = new Hono<{
  Bindings: {
      DATABASE_URL: string;
      JWT_SECRET: string;
  }, 
  Variables: {
      userId: string;
  }
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  try {
      const user = await verify(authHeader, c.env.JWT_SECRET);
      if (user) {
          c.set("userId", user.id as string);
          await next();
      } else {
          c.status(403);
          return c.json({
              message: "You are not logged in"
          })
      }
  } catch(e) {
      c.status(403);
      return c.json({
          message: "You are not logged in"
      })
  }
});

blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  if (!success) {
      c.status(411);
      return c.json({
          message: "Inputs not correct"
      })
  }

  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.blog.create({
      data: {
          title: body.title,
          content: body.content,
          authorId: Number(authorId)
      }
  })

  return c.json({
      id: blog.id
  })
})

blogRouter.put('/', async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
      c.status(411);
      return c.json({
          message: "Inputs not correct"
      })
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.blog.update({
      where: {
          id: body.id
      }, 
      data: {
          title: body.title,
          content: body.content
      }
  })

  return c.json({
      id: blog.id
  })
})

// Todo: add pagination
blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  const blogs = await prisma.blog.findMany({
      select: {
          content: true,
          title: true,
          id: true,
          author: {
              select: {
                  name: true
              }
          }
      }
  });

  return c.json({
      blogs
  })
})

blogRouter.get('/:id', async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
      const blog = await prisma.blog.findFirst({
          where: {
              id: Number(id)
          },
          select: {
              id: true,
              title: true,
              content: true,
              author: {
                  select: {
                      name: true
                  }
              }
          }
      })
  
      return c.json({
          blog
      });
  } catch(e) {
      c.status(411); // 4
      return c.json({
          message: "Error while fetching blog post"
      });
  }
})

 // why we use /:id baad main /bulk ke
 //If you have a specific instruction for "go to the market" and a general instruction for "go to any place", you need to list "go to the market" first.
//If "go to any place" is listed first, you’ll never get to follow the specific "go to the market" instruction because "any place" covers the market too.
//By listing specific instructions (routes) before general ones, you ensure that the specific needs are met first before falling back on more general instructions.







