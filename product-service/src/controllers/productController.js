import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import axios from "axios";

// Helper function to validate category
const validateCategory = async (categoryName) => {
  if (!categoryName) return true; // Allow null/undefined category (optional)
  const category = await Category.findOne({ name: categoryName });
  if (!category) {
    throw new Error(`Category '${categoryName}' does not exist`);
  }
  return true;
};

export const createProduct = async (req, res) => {
  const { name, brand, description, images, variants, category, tags } =
    req.body;

  if (
    !name ||
    !brand ||
    !description ||
    !images ||
    !variants ||
    !category ||
    variants.length < 2
  ) {
    return res
      .status(400)
      .json({
        message:
          "Missing required fields or product must have at least 2 variants",
      });
  }

  try {
    await validateCategory(category);

    const product = new Product({
      name,
      brand,
      description,
      images,
      variants, // Array of { name, stock, price }
      category,
      tags: tags || [],
      reviews: [],
      averageRating: 0,
      salesCount: 0,
      createdAt: new Date(),
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating product", error: error.message });
  }
};

export const getProducts = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "name",
    order = "asc",
    search,
    brand,
    minPrice,
    maxPrice,
    category,
  } = req.query;

  try {
    let query = {};

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by brand
    if (brand) {
      query.brand = brand;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query["variants.price"] = {};
      if (minPrice) query["variants.price"].$gte = Number(minPrice);
      if (maxPrice) query["variants.price"].$lte = Number(maxPrice);
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Sorting
    const sortOptions = {};
    if (sortBy === "name") {
      sortOptions.name = order === "asc" ? 1 : -1;
    } else if (sortBy === "price") {
      sortOptions["variants.price"] = order === "asc" ? 1 : -1;
    }

    const products = await Product.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
};
// GET /api/products/:id - Fetch a product by ID (already implemented, but update for variants)
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product", error: error.message });
  }
};

// PUT /api/products/:id - Update a product (admin-only, update for variants)
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, brand, description, images, variants, category, tags } =
    req.body;

  try {
    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update fields (only allow updating specific fields)
    if (name) product.name = name;
    if (brand) product.brand = brand;
    if (description) product.description = description;
    if (images) product.images = images;
    if (variants) {
      // Validate that there are at least 2 variants
      if (variants.length < 2) {
        return res
          .status(400)
          .json({ message: "Product must have at least 2 variants" });
      }
      // Validate each variant has required fields
      for (const variant of variants) {
        if (
          !variant.name ||
          variant.stock === undefined ||
          variant.price === undefined
        ) {
          return res
            .status(400)
            .json({ message: "Each variant must have name, stock, and price" });
        }
      }
      product.variants = variants;
    }
    if (category !== undefined) {
      await validateCategory(category);
      product.category = category;
    }
    if (tags) product.tags = tags;

    // Prevent modification of certain fields
    if (
      req.body.reviews ||
      req.body.averageRating ||
      req.body.salesCount ||
      req.body.createdAt
    ) {
      return res
        .status(400)
        .json({
          message:
            "Cannot modify reviews, averageRating, salesCount, or createdAt through this endpoint",
        });
    }

    // Save the updated product
    await product.save();
    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating product", error: error.message });
  }
};

// DELETE /api/products/:id - Delete a product
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
};

// POST /api/products/:id/review - Add a review/rating (already implemented)
export const addReview = async (req, res) => {
    const { id } = req.params;
    const { comment, rating, userName } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!comment) {
        return res.status(400).json({ message: "Comment is required" });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Use provided userName for anonymous reviews, or try to get from token
    let user = null;
    let reviewUserName = "Anonymous";
    
    if (token) {
        try {
            const response = await axios.get(
                "https://nodejs-final-ecommerce-1.onrender.com/user/verify-token",
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            user = response.data;
            // Use authenticated user's name if available
            reviewUserName = user.fullName || userName || "Authenticated User";
        } catch (error) {
            console.log("Token verification error:", error.message);
            // If token verification fails but no rating, allow anonymous review
            if (!rating) {
                // Continue with anonymous review
                reviewUserName = userName || "Anonymous";
            } else {
                // Only require authentication for rated reviews
                return res.status(401).json({ message: "Invalid token for rated review" });
            }
        }
    } else if (userName) {
        // Use provided userName for anonymous reviews
        reviewUserName = userName;
    }

    // Only require authentication for rated reviews (with a rating value)
    if (rating && !user) {
        return res
            .status(401)
            .json({ message: "You must be logged in to rate a product" });
    }

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const review = {
            userId: user ? user.userId : null,
            userName: reviewUserName,
            comment,
            rating: rating || null,
            createdAt: new Date(),
        };

        product.reviews.push(review);
        
        // Recalculate average rating if this review includes a rating
        if (rating) {
            const ratedReviews = product.reviews.filter(r => r.rating);
            if (ratedReviews.length > 0) {
                const totalRating = ratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                product.averageRating = totalRating / ratedReviews.length;
            }
        }
        
        await product.save();

        if (global.io) {
            global.io.emit(`product:${id}:review`, review);
        }

        res.status(201).json({ message: "Review added successfully", review });
    } catch (error) {
        res
            .status(500)
            .json({ message: "Error adding review", error: error.message });
    }
};

// GET /api/products/:id/reviews - Fetch reviews (already implemented)
export const getReviews = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product.reviews);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: error.message });
  }
};

// POST /api/products/update-stock - Update stock (update for variants)
export const updateStock = async (req, res) => {
  const { items } = req.body; // items: [{ productId, variantName, quantity }]

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Items array required" });
  }

  try {
    for (const item of items) {
      const { productId, variantName, quantity } = item;
      if (!productId || !variantName || !quantity || quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid productId, variantName, or quantity" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });
      }

      const variant = product.variants.find((v) => v.name === variantName);
      if (!variant) {
        return res
          .status(404)
          .json({
            message: `Variant ${variantName} not found for product ${product.name}`,
          });
      }

      if (variant.stock < quantity) {
        return res
          .status(400)
          .json({
            message: `Insufficient stock for variant ${variantName} of product ${product.name}. Available: ${variant.stock}, Requested: ${quantity}`,
          });
      }

      variant.stock -= quantity;
      product.salesCount += quantity; // Track sales for best-selling products
      await product.save();
    }

    res.status(200).json({ message: "Stock updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating stock", error: error.message });
  }
};

// GET /api/products/best-sellers - Fetch best-selling products (for admin dashboard)
export const getBestSellers = async (req, res) => {
  try {
    const bestSellers = await Product.find().sort({ salesCount: -1 }).limit(5); // Top 5 best-selling products
    res.status(200).json(bestSellers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching best sellers", error: error.message });
  }
};
// In productController.js
export const getNewProducts = async (req, res) => {
  const { limit = 4 } = req.query;
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching new products", error: error.message });
  }
};


// GET /api/categories - Fetch all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching categories", error: error.message });
  }
};

// POST /api/products/:id/inventory - Update inventory (admin-only)
export const updateInventory = async (req, res) => {
  const { id } = req.params;
  const { variantName, stock } = req.body;

  if (!variantName || stock === undefined || stock < 0) {
    return res.status(400).json({ message: "Invalid variantName or stock" });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.find((v) => v.name === variantName);
    if (!variant) {
      return res
        .status(404)
        .json({ message: `Variant ${variantName} not found` });
    }

    variant.stock = stock;
    await product.save();
    res
      .status(200)
      .json({ message: "Inventory updated successfully", product });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating inventory", error: error.message });
  }
};

// New method to increment salesCount
export const incrementSalesCount = async (req, res) => {
  const { id } = req.params;
  const { quantity = 1 } = req.body; // Default to 1 if quantity not provided

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.salesCount += Number(quantity);
    await product.save();

    res.status(200).json({ message: "Sales count updated successfully", product });
  } catch (error) {
    res.status(500).json({ message: "Error updating sales count", error: error.message });
  }
};
