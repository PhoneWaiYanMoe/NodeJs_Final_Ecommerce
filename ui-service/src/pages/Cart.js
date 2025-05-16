import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../App";

const Cart = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cartSummary, setCartSummary] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [message, setMessage] = useState("");
  const [userPoints, setUserPoints] = useState(0);

  const CART_API_URL = "https://nodejs-final-ecommerce-1.onrender.com/cart";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchCartSummary();
    fetchUserPoints();
  }, [user, navigate]);

  const fetchCartSummary = async () => {
    try {
      setMessage(""); // Clear any previous messages
      
      // Get token if available (for logged-in users)
      const token = localStorage.getItem("token");
      const sessionId = localStorage.getItem("guestSessionId");
      
      // For debugging
      console.log("Fetching cart summary:", {
        hasToken: !!token,
        sessionId: sessionId
      });
      
      // Prepare headers and params
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = {};
      
      // Add discount code if exists
      if (discountCode) {
        params.discountCode = discountCode;
      }
      
      // Add sessionId for guests
      if (!token && sessionId) {
        params.sessionId = sessionId;
      }
      
      console.log("Cart request:", {
        url: `${CART_API_URL}/summary`,
        headers,
        params
      });
      
      const response = await axios.get(`${CART_API_URL}/summary`, {
        headers,
        params,
      });

      console.log("Cart response:", response.data);

      if (response.data.message === "Cart is empty") {
        setCartSummary({ items: [] });
      } else {
        setCartSummary(response.data);
        
        // If this is a guest and we get a sessionId back, store it
        if (!token && response.data.sessionId) {
          localStorage.setItem("guestSessionId", response.data.sessionId);
          console.log("Saved guest sessionId:", response.data.sessionId);
        }
      }
    } catch (error) {
      console.error("Error fetching cart summary:", error);
      if (error.response) {
        console.error("Server error:", error.response.data);
        setMessage(`Failed to load cart: ${error.response.data.error || 'Server error'}`);
      } else if (error.request) {
        setMessage("Failed to load cart: No response from server");
      } else {
        setMessage(`Failed to load cart: ${error.message}`);
      }
    }
  };

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const response = await axios.get(`${CART_API_URL}/points`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      setUserPoints(response.data.points || 0);
    } catch (error) {
      console.error("Error fetching user points:", error);
      setUserPoints(0);
    }
  };
  
  const handleAddToCart = async () => {
    try {
      const token = localStorage.getItem("token");
      const sessionId = localStorage.getItem("guestSessionId");
      
      const productId = "507f1f77bcf86cd799439011"; // Replace with dynamic product ID
      const quantity = 1;
      const price = 10.0;
      
      const requestBody = {
        product_id: productId,
        quantity,
        price
      };
      
      // If this is a guest and we have a sessionId, include it
      if (!token && sessionId) {
        requestBody.sessionId = sessionId;
      }
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(
        `${CART_API_URL}/add`,
        requestBody,
        { headers }
      );
      
      // If this is a guest and we got a sessionId back, store it
      if (!token && response.data.sessionId) {
        localStorage.setItem("guestSessionId", response.data.sessionId);
      }

      fetchCartSummary();
      setMessage("Item added to cart successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setMessage("Failed to add item to cart.");
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      const token = localStorage.getItem("token");
      const sessionId = localStorage.getItem("guestSessionId");
      
      const requestBody = { quantity: newQuantity };
      
      // Add sessionId for guests
      if (!token && sessionId) {
        requestBody.sessionId = sessionId;
      }
      
      // Prepare headers
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Make the API call
      await axios.put(
        `${CART_API_URL}/update/${itemId}`,
        requestBody,
        { headers }
      );

      // Refresh cart after updating
      fetchCartSummary();
    } catch (error) {
      console.error("Error updating quantity:", error);
      if (error.response) {
        console.error("Server error:", error.response.data);
        setMessage(`Failed to update quantity: ${error.response.data.error || 'Server error'}`);
      } else if (error.request) {
        setMessage("Failed to update quantity: No response from server");
      } else {
        setMessage(`Failed to update quantity: ${error.message}`);
      }
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      // Get token if available (for logged-in users)
      const token = localStorage.getItem("token");
      const sessionId = localStorage.getItem("guestSessionId");
      
      console.log("Removing item:", {
        itemId,
        hasToken: !!token,
        sessionId
      });
      
      // Prepare headers
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Prepare URL and params
      let url = `${CART_API_URL}/remove/${itemId}`;
      const params = {};
      
      // Add sessionId for guests
      if (!token && sessionId) {
        params.sessionId = sessionId;
      }
      
      // Make the API call
      await axios.delete(url, {
        headers,
        params
      });

      // Refresh cart after removing
      fetchCartSummary();
      setMessage("Item removed from cart.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error removing item:", error);
      if (error.response) {
        console.error("Server error:", error.response.data);
        setMessage(`Failed to remove item: ${error.response.data.error || 'Server error'}`);
      } else if (error.request) {
        setMessage("Failed to remove item: No response from server");
      } else {
        setMessage(`Failed to remove item: ${error.message}`);
      }
    }
  };

  const handleApplyDiscount = async () => {
    try {
      const token = localStorage.getItem("token");
      const sessionId = localStorage.getItem("guestSessionId");
      
      // Prepare request body
      const requestBody = { code: discountCode };
      
      // Add sessionId for guests
      if (!token && sessionId) {
        requestBody.sessionId = sessionId;
      }
      
      // Prepare headers
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Make the API call
      await axios.post(
        `${CART_API_URL}/apply-discount`,
        requestBody,
        { headers }
      );

      // Refresh cart after applying discount
      await fetchCartSummary();
      setMessage(`Discount applied successfully! (${discountCode})`);
      setTimeout(() => setMessage(""), 3000);
      setDiscountCode("");
    } catch (error) {
      console.error("Error applying discount:", error);
      if (error.response) {
        console.error("Server error:", error.response.data);
        setMessage(error.response.data.error || "Invalid or expired discount code.");
      } else if (error.request) {
        setMessage("Failed to apply discount: No response from server");
      } else {
        setMessage(`Failed to apply discount: ${error.message}`);
      }
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
      navigate("/login");
    } else {
      navigate("/login");
    }
  };

  // Function to format the productId(variantName) display
  const formatProductDisplay = (item) => {
    return `${item.productId} (${item.variantName})`;
  };

  return (
    <div
      style={{
        backgroundColor: "#000000",
        color: "#FFFFFF",
        minHeight: "100vh",
        fontFamily: "'Playfair Display', serif",
      }}
    >
      <header
        style={{
          backgroundColor: "#000000",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #D4AF37",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="LuxeLane Logo"
            style={{ width: "50px", height: "50px", marginRight: "15px" }}
          />
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#D4AF37",
                margin: 0,
              }}
            >
              LuxeLane
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#E0E0E0",
                margin: 0,
              }}
            >
              Elevate Your Everyday.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ fontSize: "16px", color: "#D4AF37" }}>
            Hello {user ? user.name : "Guest"}
            {user && userPoints > 0 && (
              <span style={{ marginLeft: "10px", color: "#55FF55", fontSize: "14px" }}>
                (Points: {userPoints})
              </span>
            )}
          </span>
          <Link to="/">
            <button
              style={{
                padding: "10px 20px",
                backgroundColor: "#D4AF37",
                color: "#000000",
                border: "none",
                borderRadius: "5px",
                fontFamily: "'Roboto', sans-serif",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#E0E0E0")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#D4AF37")
              }
            >
              Back to Products
            </button>
          </Link>
          <button
            onClick={handleAuthAction}
            style={{
              padding: "10px 20px",
              backgroundColor: "#D4AF37",
              color: "#000000",
              border: "none",
              borderRadius: "5px",
              fontFamily: "'Roboto', sans-serif",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E0E0E0")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#D4AF37")
            }
          >
            {user ? "Logout" : "Login"}
          </button>
        </div>
      </header>

      <main style={{ padding: "40px" }}>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            color: "#D4AF37",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          Your Cart
        </h1>

        {message && (
          <p
            style={{
              fontSize: "16px",
              color: message.includes("Failed") || message.includes("Invalid") ? "#FF5555" : "#D4AF37",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            backgroundColor: "#1A1A1A",
            padding: "30px",
            borderRadius: "10px",
            marginBottom: "30px",
          }}
        >
          {!cartSummary ||
          !cartSummary.items ||
          cartSummary.items.length === 0 ? (
            <p style={{ color: "#E0E0E0", textAlign: "center" }}>
              Your cart is empty.{" "}
              <Link to="/" style={{ color: "#D4AF37" }}>
                Continue shopping
              </Link>
              .
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#FFFFFF",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #D4AF37" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Product ID (Variant)
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Quantity
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Price</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Total</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {cartSummary.items.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #333333" }}
                  >
                    <td style={{ padding: "10px" }}>{formatProductDisplay(item)}</td>
                    <td style={{ padding: "10px" }}>
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        onChange={(e) =>
                          handleUpdateQuantity(item.id, Number(e.target.value))
                        }
                        style={{
                          width: "60px",
                          padding: "5px",
                          backgroundColor: "#E0E0E0",
                          border: "none",
                          borderRadius: "5px",
                          color: "#000000",
                        }}
                      />
                    </td>
                    <td style={{ padding: "10px" }}>
                      ${item.price.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#FF5555",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#FF7777")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#FF5555")
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={handleAddToCart}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#D4AF37",
              color: "#000000",
              border: "none",
              borderRadius: "5px",
              fontFamily: "'Roboto', sans-serif",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E0E0E0")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#D4AF37")
            }
          >
            Add Item (Test)
          </button>
        </div>

        {cartSummary && cartSummary.items && cartSummary.items.length > 0 && (
          <div
            style={{
              backgroundColor: "#1A1A1A",
              padding: "30px",
              borderRadius: "10px",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Enter Discount Code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#E0E0E0",
                  border: "none",
                  borderRadius: "5px",
                  color: "#000000",
                  fontFamily: "'Roboto', sans-serif",
                }}
              />
              <button
                onClick={handleApplyDiscount}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#D4AF37",
                  color: "#000000",
                  border: "none",
                  borderRadius: "5px",
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  transition: "background-color 0.3s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E0E0E0")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#D4AF37")
                }
              >
                Apply
              </button>
            </div>
            <p
              style={{
                fontSize: "16px",
                color: "#E0E0E0",
                marginBottom: "15px",
              }}
            >
              Subtotal: ${cartSummary.subtotal?.toFixed(2) || "0.00"}
            </p>
            {cartSummary.discountApplied > 0 && (
              <p
                style={{
                  fontSize: "16px",
                  color: "#D4AF37",
                  marginBottom: "15px",
                }}
              >
                Discount ({cartSummary.discountCode} - {cartSummary.discountPercentage}%): -$
                {cartSummary.discountApplied?.toFixed(2) || "0.00"}
              </p>
            )}
            <p
              style={{
                fontSize: "16px",
                color: "#E0E0E0",
                marginBottom: "15px",
              }}
            >
              Taxes: ${cartSummary.taxes?.toFixed(2) || "0.00"}
            </p>
            <p
              style={{
                fontSize: "16px",
                color: "#E0E0E0",
                marginBottom: "15px",
              }}
            >
              Shipping Fee: ${cartSummary.shippingFee?.toFixed(2) || "0.00"}
            </p>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#D4AF37",
                marginBottom: "20px",
              }}
            >
              Total: ${cartSummary.total?.toFixed(2) || "0.00"}
            </p>
            
            {user && userPoints > 0 && (
              <div style={{ 
                backgroundColor: '#222',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                borderLeft: '3px solid #55FF55'
              }}>
                <p style={{ fontSize: '14px', color: '#E0E0E0', margin: 0 }}>
                  You have <span style={{ color: '#55FF55', fontWeight: 'bold' }}>{userPoints} loyalty points</span> available
                  that can be used at checkout!
                </p>
              </div>
            )}
            
            <Link to="/checkout" state={{ cartSummary, discountCode: cartSummary.discountCode }}>
              <button
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#D4AF37",
                  color: "#000000",
                  border: "none",
                  borderRadius: "5px",
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  transition: "background-color 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E0E0E0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#D4AF37")}
              >
                Proceed to Checkout
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;


const handleProceedToCheckout = () => {
  if (!user) {
    // If guest, redirect to login with a flag to return to checkout
    localStorage.setItem('checkoutRedirect', 'true');
    navigate('/login');
  } else {
    // If logged in user, proceed directly to checkout
    navigate('/checkout', {
      state: {
        cartSummary,
        discountCode: cartSummary.discountCode
      }
    });
  }
};
