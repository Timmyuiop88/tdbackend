const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Create a user
app.post('/users', async (req, res) => {
  const { email, firstName, lastName, clerkId, phoneNumber } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, firstName, lastName, clerkId, phoneNumber },
    });
    console.log(user)
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Delete a product by ID
app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const deletedProduct = await prisma.product.delete({
        where: {
          id: parseInt(id), // Assuming the product ID is an integer
        },
      });
  
      res.status(200).json(deletedProduct);
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product.' });
    }
  });

// Route to get a single user by clerkId
app.get('/users/:clerkId', async (req, res) => {
    const { clerkId } = req.params;
  
    try {
      const user = await prisma.user.findUnique({
        where: {
          clerkId: clerkId, // Assuming clerkId is an integer in the database
        },
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user.' });
    }
  });

// Get all users
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// Create a product
app.post('/products', async (req, res) => {
  const { title, description, price, mainPhoto, photos, userId } = req.body;
  try {
    const product = await prisma.product.create({
      data: { title, description, price, mainPhoto, photos, userId },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all products that are not sold
app.get('/products', async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        where: { isSold: false },
        orderBy: {
          id: 'desc', // Order by id in descending order
        },
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products.' });
    }
  });

// Get all sold products
app.get('/products/sold', async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isSold: true },
  });
  res.json(products);
});

// Create an offer
app.post('/offers', async (req, res) => {
  const { amount, message, userId, productId } = req.body;
  const existingOffers = await prisma.offer.findMany({
    where: { userId, productId },
  });
  if (existingOffers.length >= 2) {
    return res.status(400).json({ error: "You can only make two offers per product" });
  }
  try {
    const offer = await prisma.offer.create({
      data: { amount, message, userId, productId },
    });
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/users/:clerkId/offers', async (req, res) => {
    const { clerkId } = req.params;

    try {
        const offers = await prisma.offer.findMany({
            where: {
                
                    userId: parseInt(clerkId)
                
            },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        price: true,
                        mainPhoto: true,
                        photos: true,
                        isSold: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                // Add other user fields as needed
                            }
                        },
                        // Add other product fields as needed
                    }
                },
                // Include other relations if needed
            }
        });

        res.json(offers);
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({ error: 'Failed to fetch offers.' });
    }
});


// Accept an offer
app.post('/offers/:offerId/accept', async (req, res) => {
  const { offerId } = req.params;
  try {
    const offer = await prisma.offer.update({
      where: { id: parseInt(offerId, 10) },
      data: { accepted: true },
    });
    await prisma.acceptedOffer.create({
      data: { offerId: offer.id },
    });
    res.json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark product as sold
app.post('/products/:productId/sell', async (req, res) => {
  const { productId } = req.params;
  const { buyerId } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(productId, 10) },
      data: { isSold: true, buyerId: parseInt(buyerId, 10) },
    });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// View seller contact if offer accepted
app.get('/products/:productId/contact', async (req, res) => {
  const { productId } = req.params;
  const { userId } = req.body;
  const acceptedOffer = await prisma.acceptedOffer.findFirst({
    where: {
      offer: {
        productId: parseInt(productId, 10),
        userId: parseInt(userId, 10),
        accepted: true,
      },
    },
    include: {
      offer: {
        include: {
          product: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
  if (!acceptedOffer) {
    return res.status(403).json({ error: "Offer not accepted or invalid" });
  }
  res.json({ contact: acceptedOffer.offer.product.user.phoneNumber });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
