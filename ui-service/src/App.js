import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [minPrice, setMinPrice] = useState('100');
    const [maxPrice, setMaxPrice] = useState('2000');

    // Remove fetchProducts from useEffect dependencies to avoid unnecessary calls
    const fetchProducts = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (category) params.category = category;
            if (minPrice) params.minPrice = minPrice;
            if (maxPrice) params.maxPrice = maxPrice;

            const response = await axios.get('http://localhost:3001/api/products', { params });
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    // Call fetchProducts on component mount only
    useEffect(() => {
        fetchProducts();
    }, []); // Empty dependency array to run only on mount

    // Handle search button click
    const handleSearch = () => {
        fetchProducts();
    };

    return (
        <div className="App">
            <h1>Product Catalog</h1>
            <div>
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            <div>
                {products.length > 0 ? (
                    products.map((product) => (
                        <div key={product._id} className="product">
                            <h3>{product.name}</h3>
                            <p>{product.description}</p>
                            <p>Price: ${product.price}</p>
                            <p>Category: {product.category}</p>
                            <p>Stock: {product.stock}</p>
                        </div>
                    ))
                ) : (
                    <p>No products found.</p>
                )}
            </div>
        </div>
    );
}

export default App;