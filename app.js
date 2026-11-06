
// ========================================
// VAL WARTE CUSTOMER LOOKUP PORTAL
// Supabase Authentication
// ========================================

const SUPABASE_URL =
  "https://tjckvjlosntwfzsxuvoa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Wvqed39tSxaRVTvw0iPrVw_vUkO9R0M";

// Initialize Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Interface elements
const loginScreen = document.getElementById("login-screen");
const portalHeader = document.getElementById("portal-header");
const portalApp = document.getElementById("portal-app");

const loginForm = document.getElementById("staff-login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");

// Display login messages
function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.style.color =
    type === "success" ? "#27AE60" : "#E05252";
}

// Show authenticated portal
function showPortal() {
  loginScreen.hidden = true;
  portalHeader.hidden = false;
  portalApp.hidden = false;
}

// Show login screen
function showLogin() {
  loginScreen.hidden = false;
  portalHeader.hidden = true;
  portalApp.hidden = true;
}

// Verify authenticated staff account
async function verifyActiveStaff(user) {
  const { data, error } = await supabaseClient
    .from("staff_accounts")
    .select("staff_id, full_name, role, status")
    .eq("auth_user_id", user.id)
    .eq("status", "Active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// Check existing login session
async function initializePortal() {
  showLogin();

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    showLoginMessage("Unable to verify your session.");
    return;
  }

  const session = data.session;

  if (!session) {
    return;
  }

  try {
    const staff = await verifyActiveStaff(session.user);

    if (!staff) {
      await supabaseClient.auth.signOut();
      showLoginMessage(
        "Your account is not authorized for portal access."
      );
      return;
    }

    showPortal();
  } catch (error) {
    console.error("Staff verification error:", error);
    showLoginMessage(
      "Unable to verify staff access. Please try again."
    );
  }
}

// Staff login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("staff-email")
    .value.trim();

  const password = document
    .getElementById("staff-password")
    .value;

  const loginButton =
    document.getElementById("login-button");

  loginButton.disabled = true;
  loginButton.textContent = "SIGNING IN...";
  showLoginMessage("");

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    const staff = await verifyActiveStaff(data.user);

    if (!staff) {
      await supabaseClient.auth.signOut();

      showLoginMessage(
        "Access denied. Your staff account is inactive or unauthorized."
      );

      return;
    }

    showPortal();

  } catch (error) {
    console.error("Login error:", error);

    showLoginMessage(
      error.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : "Unable to sign in. Please check your account and try again."
    );

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "SIGN IN";
  }
});

// Staff logout
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await supabaseClient.auth.signOut();

  logoutButton.disabled = false;

  if (error) {
    console.error("Logout error:", error);
    alert("Unable to sign out. Please try again.");
    return;
  }

  loginForm.reset();
  showLogin();
  showLoginMessage("You have successfully signed out.", "success");
});

// Start portal
initializePortal();


// ========================================
// CUSTOMER ACCOUNT SEARCH ENGINE
// ========================================

const customerSearchForm =
  document.getElementById("customer-search-form");

const resultsContainer =
  document.getElementById("results-container");

const resultCount =
  document.getElementById("result-count");

const searchButton =
  document.getElementById("search-button");

// Safely create HTML elements using text content
function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;

  return element;
}

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(amount || 0));
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function showSearchMessage(message, type = "normal") {
  resultsContainer.replaceChildren();

  const messageElement = createElement(
    "div",
    `search-message ${type}`,
    message
  );

  resultsContainer.appendChild(messageElement);
}

function addDetail(container, label, value) {
  const detail = createElement("div", "customer-detail");

  detail.appendChild(
    createElement("span", "detail-label", label)
  );

  detail.appendChild(
    createElement("span", "detail-value", value || "Not available")
  );

  container.appendChild(detail);
}

// Render customer profiles and their order histories
function renderCustomers(customers, orders, items) {
  resultsContainer.replaceChildren();

  resultCount.textContent = `${customers.length} Customer${customers.length === 1 ? "" : "s"}`;

  customers.forEach(customer => {
    const customerCard = createElement(
      "article",
      "customer-result"
    );

    const customerHeader = createElement(
      "div",
      "customer-result-header"
    );

    customerHeader.appendChild(
      createElement("h3", "customer-name", customer.full_name)
    );

    customerHeader.appendChild(
      createElement("span", "customer-id-badge", customer.customer_id)
    );

    customerCard.appendChild(customerHeader);

    const profileGrid = createElement(
      "div",
      "customer-details-grid"
    );

    addDetail(profileGrid, "Email Address", customer.email);
    addDetail(profileGrid, "Phone Number", customer.phone);
    addDetail(profileGrid, "Mailing Address", customer.mailing_address);
    addDetail(profileGrid, "Customer Since", formatDate(customer.created_at));

    customerCard.appendChild(profileGrid);

    // Customer order history
    const customerOrders = orders.filter(
      order => order.customer_id === customer.customer_id
    );

    const orderHeading = createElement(
      "h4",
      "order-history-heading",
      `ORDER HISTORY (${customerOrders.length})`
    );

    customerCard.appendChild(orderHeading);

    if (customerOrders.length === 0) {
      customerCard.appendChild(
        createElement("p", "empty-orders", "No order history available.")
      );
    }

    customerOrders.forEach(order => {
      const orderCard = createElement("div", "order-card");

      const orderTop = createElement("div", "order-card-header");

      orderTop.appendChild(
        createElement("strong", "order-id", order.order_id)
      );

      orderTop.appendChild(
        createElement(
          "span",
          "order-status",
          order.order_status
        )
      );

      orderCard.appendChild(orderTop);

      const orderDetails = createElement(
        "div",
        "order-details-grid"
      );

      addDetail(orderDetails, "Order Date", formatDate(order.order_date));
      addDetail(orderDetails, "Payment Method", order.payment_method);
      addDetail(orderDetails, "Payment Status", order.payment_status);
      addDetail(orderDetails, "Total Amount", formatPHP(order.total_amount_php));
      addDetail(orderDetails, "Courier", order.courier);
      addDetail(orderDetails, "Tracking Number", order.tracking_number);
      addDetail(orderDetails, "Delivery Date", formatDate(order.delivery_date));

      orderCard.appendChild(orderDetails);

      // Products purchased in this order
      const orderItems = items.filter(
        item => item.order_id === order.order_id
      );

      const itemHeading = createElement(
        "p",
        "order-items-heading",
        "PURCHASED ITEMS"
      );

      orderCard.appendChild(itemHeading);

      orderItems.forEach(item => {
        const itemRow = createElement("div", "order-item");

        itemRow.appendChild(
          createElement(
            "span",
            "item-name",
            `${item.product_name} × ${item.quantity}`
          )
        );

        itemRow.appendChild(
          createElement(
            "span",
            "item-price",
            formatPHP(item.line_total_php)
          )
        );

        orderCard.appendChild(itemRow);
      });

      customerCard.appendChild(orderCard);
    });

    resultsContainer.appendChild(customerCard);
  });
}

// Execute customer search
customerSearchForm.addEventListener("submit", async event => {
  event.preventDefault();

  const search = {
    orderId: document.getElementById("order-id").value.trim(),
    tracking: document.getElementById("tracking-number").value.trim(),
    fullName: document.getElementById("full-name").value.trim(),
    customerId: document.getElementById("customer-id").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("mailing-address").value.trim()
  };

  const hasOrderCriteria = Boolean(
    search.orderId || search.tracking
  );

  const hasCustomerCriteria = Boolean(
    search.fullName ||
    search.customerId ||
    search.phone ||
    search.email ||
    search.address
  );

  if (!hasOrderCriteria && !hasCustomerCriteria) {
    showSearchMessage(
      "Please enter at least one customer detail to search.",
      "error"
    );
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "SEARCHING...";
  resultCount.textContent = "Searching...";

  showSearchMessage("Searching customer records...", "loading");

  try {
    let matchingOrderCustomerIds = null;

    // Exact order ID and tracking number searches
    if (hasOrderCriteria) {
      let orderQuery = supabaseClient
        .from("orders")
        .select("customer_id");

      if (search.orderId) {
        orderQuery = orderQuery.eq("order_id", search.orderId);
      }

      if (search.tracking) {
        orderQuery = orderQuery.eq("tracking_number", search.tracking);
      }

      const { data: matchingOrders, error: orderError } =
        await orderQuery;

      if (orderError) throw orderError;

      matchingOrderCustomerIds = [
        ...new Set(matchingOrders.map(order => order.customer_id))
      ];

      if (matchingOrderCustomerIds.length === 0) {
        resultCount.textContent = "0 Customers";
        showSearchMessage(
          "No customer records found matching your search.",
          "empty"
        );
        return;
      }
    }

    // Customer profile search
    let customerQuery = supabaseClient
      .from("customers")
      .select("*");

    if (search.customerId) {
      customerQuery = customerQuery.eq(
        "customer_id",
        search.customerId
      );
    }

    if (search.fullName) {
      customerQuery = customerQuery.ilike(
        "full_name",
        `%${search.fullName}%`
      );
    }

    if (search.phone) {
      customerQuery = customerQuery.eq(
        "phone",
        search.phone
      );
    }

    if (search.email) {
      customerQuery = customerQuery.ilike(
        "email",
        search.email
      );
    }

    if (search.address) {
      customerQuery = customerQuery.ilike(
        "mailing_address",
        `%${search.address}%`
      );
    }

    if (matchingOrderCustomerIds !== null) {
      customerQuery = customerQuery.in(
        "customer_id",
        matchingOrderCustomerIds
      );
    }

    const { data: customers, error: customerError } =
      await customerQuery;

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      resultCount.textContent = "0 Customers";

      showSearchMessage(
        "No customer records found matching your search.",
        "empty"
      );

      return;
    }

    const customerIds = customers.map(
      customer => customer.customer_id
    );

    // Retrieve all orders belonging to matched customers
    const { data: orders, error: ordersError } =
      await supabaseClient
        .from("orders")
        .select("*")
        .in("customer_id", customerIds)
        .order("order_date", { ascending: false });

    if (ordersError) throw ordersError;

    const orderIds = orders.map(order => order.order_id);

    // Retrieve purchased products
    let items = [];

    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } =
        await supabaseClient
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      items = orderItems || [];
    }

    renderCustomers(customers, orders, items);

  } catch (error) {
    console.error("Customer search error:", error);

    resultCount.textContent = "Search Error";

    showSearchMessage(
      "Unable to retrieve customer records. Please try again.",
      "error"
    );

  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search Accounts";
  }
});

// Clear search results when the form is reset
customerSearchForm.addEventListener("reset", () => {
  resultCount.textContent = "0 Records";

  showSearchMessage(
    "Enter a customer detail above to search for an account."
  );
});
