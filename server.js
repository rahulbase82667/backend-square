const express = require('express');
const FormData = require('form-data');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();
const crypto = require('crypto');
const port = 3001;
const multer = require('multer');
const LOCATION_ID = "L6NEBHY0KA8SQ"

const SQUARE_API_URL = 'https://connect.squareup.com/v2/online-checkout/payment-links';
const SQUARE_ACCESS_TOKEN = "EAAAl_VtGNdCfwlwBy_sGpelkAW_fyZhNiA1pqMG3KIB-SAaZN9gqFTKXNUviZSg";


const SQUARE_IMAGE_API = 'https://connect.squareup.com/v2/catalog/images';

const SQUARE_IMAGE_ACCESS_TOKEN = "EAAAlzgK0JQUthQ993_EIKGXOeI9EJv-fgKcsbF4prmpZ4MB1gTOChj9TGbevhdl";


app.use(express.json());

// Enable CORS for all routesss
// app.use(cors({
//   origin: 'http://localhost:8080',
//   credentials: true
// }));

app.use(cors({
  origin : '*',
  credentials : true
}))

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/create-payment-link', async (req, res) => {
  try {
    const { productName, price, currency = 'GBP' } = req.body;

    if (!productName || !price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const payload = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: LOCATION_ID,
        line_items: [
          {
            name: productName,
            quantity: '1',
            base_price_money: {
              amount: price * 100,
              currency
            }
          }
        ]
      }
    };

    const response = await axios.post(SQUARE_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentLink = response.data.payment_link.url;

    return res.status(200).json({
      success: true,
      paymentLink
    });
  } catch (error) {
    console.error('Error creating payment link:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment link'
    });
  }
});


// Proxy endpoint for Square API
app.post('/api/catalog/object', async (req, res) => {
  try {
    const response = await axios.post(
      'https://connect.squareup.com/v2/catalog/object',
      req.body,
      {
        headers: {
          Authorization: `Bearer EAAAlk3V8-x2wAZd8-F8ERSbWpCNXrr0Yqm1fr-ohMpcZwu1RfXFqHW-4JBZycKc`,
          "Content-Type": "application/json"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

app.get('/api/catalog/list', async (req, res) => {
  try {
    const response = await axios.get('https://connect.squareup.com/v2/catalog/list', {
      headers: {
        Authorization: `Bearer EAAAl7wuu6ayAloKJ0uxnDTt6QX2-Sa8W7tmGSuMcADB09D4CNQgyrgBa19QG5hC`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Square API:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});


app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { objectId, name, caption } = req.body;

    if (!req.file || !objectId || !name) {
      return res.status(400).json({ success: false, message: 'Image file, objectId, and name are required' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, req.file.originalname);
    form.append(
      'request',
      JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        object_id: objectId,
        image: {
          type: 'IMAGE',
          id: `#${crypto.randomUUID()}`,
          image_data: {
            name,
            caption
          }
        }
      })
    );

    const response = await axios.post(SQUARE_IMAGE_API, form, {
      headers: {
        Authorization: `Bearer ${SQUARE_IMAGE_ACCESS_TOKEN}`,
        ...form.getHeaders()
      }
    });

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error uploading image:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to upload image'
    });
  }
});

app.delete('/api/catalog/object/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.delete(
      `https://connect.squareup.com/v2/catalog/object/${id}`,
      {
        headers: {
          Authorization: "Bearer EAAAlwHqntVikuasM2tsIdnYqngbuJ99vGLc_a8CvKigPPW3qMOlSz6u9FyhCjf0",
          'Square-Version': '2025-03-19',  
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Ensure response confirms successful deletion
    if (response.data?.deleted_object_ids?.includes(id)) {
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: response.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete product. No confirmation received.',
      });
    }
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.detail ||
                         error.response?.data?.message ||
                         'Failed to delete product';

    console.error('Error deleting product:', error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});





app.get('/api/product/:id', async (req, res) => {
  const { id } = req.params;


  try {
    const response = await axios.get(
      `https://connect.squareup.com/v2/catalog/object/${id}`,
      {
        headers: {
          Authorization: `Bearer EAAAlk3V8-x2wAZd8-F8ERSbWpCNXrr0Yqm1fr-ohMpcZwu1RfXFqHW-4JBZycKc`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;


    let product;

    if (data.object.type === 'ITEM') {
      product = {
        id: data.object.id,
        name: data.object.item_data.name || 'Unknown Product',
        price:
          data.object.item_data.variations[0]?.item_variation_data?.price_money
            ?.amount / 100 || 0,
        usdPrice:
          (data.object.item_data.variations[0]?.item_variation_data?.price_money
            ?.amount /
            100) *
          1.27,
        inventory: data.object.item_data.variations[0]?.item_variation_data
          ?.stockable
          ? 1
          : 0,
        status: data.object.is_deleted ? 'Inactive' : 'Active',
        platforms: data.object.item_data.channels || [],
        description:
          data.object.item_data.description || 'No description available',
        category: 'Miscellaneous',
        dateAdded: data.object.created_at.split('T')[0],
        lastUpdated: data.object.updated_at.split('T')[0],
        image: data.object.item_data.ecom_image_uris?.[0] || '/placeholder.svg',
        images: data.object.item_data.ecom_image_uris || ['/placeholder.svg'],
        sku: data.object.id,
      };
    } else if (data.object.type === 'ITEM_VARIATION') {
      product = {
        id: data.object.id,
        name: data.object.item_variation_data.name || 'Unknown Product',
        price:
          data.object.item_variation_data.price_money?.amount / 100 || 0,
        usdPrice:
          (data.object.item_variation_data.price_money?.amount / 100) * 1.27,
        inventory: data.object.item_variation_data.stockable ? 1 : 0,
        status: data.object.is_deleted ? 'Inactive' : 'Active',
        platforms: data.object.item_variation_data.channels || [],
        description: 'No description available',
        category: 'Miscellaneous',
        dateAdded: data.object.created_at.split('T')[0],
        lastUpdated: data.object.updated_at.split('T')[0],
        image: '/placeholder.svg',
        images: ['/placeholder.svg'],
        sku: data.object.id,
      };
    } else {
      throw new Error(`Unsupported object type: ${data.object.type}`);
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Internal Server Error',
    });
  }
});


app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});