import Product from '../models/productModel.js';

// Create a product 
export const createProduct = async (req, res) => { try { const product = new Product(req.body); await product.save(); res.status(201).json(product); } catch (error) { res.status(400).json({ message: 'Error creating product', error }); } };

// Get all products 
export const getProducts = async (req, res) => { try { const products = await Product.find(); res.status(200).json(products); } catch (error) { res.status(500).json(400).json({ message: 'Error fetching products', error }); } };

// Get a product by ID 
export const getProductById = async (req, res) => { try { const product = await Product.findById(req.params.id); if (!product) { return res.status(404).json({ message: 'Product not found' }); } res.status(200).json(product); } catch (error) { res.status(500).json({ message: 'Error fetching product', error }); } };

// Update a product 
export const updateProduct = async (req, res) => { try { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true, }); if (!product) { return res.status(404).json({ message: 'Product not found' }); } res.status(200).json(product); } catch (error) { res.status(400).json({ message: 'Error updating product', error }); } };

// Delete a product 
export const deleteProduct = async (req, res) => { try { const product = await Product.findByIdAndDelete(req.params.id); if (!product) { return res.status(404).json({ message: 'Product not found' }); } res.status(200).json({ message: 'Product deleted' }); } catch (error) { res.status(500).json({ message: 'Error deleting product', error }); } };