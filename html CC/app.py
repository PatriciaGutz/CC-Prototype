import streamlit as st

# Configure page layout
st.set_page_config(
    page_title="Campus Chicken SmartStall", page_icon="🍗", layout="wide"
)

# --- CUSTOM CSS INJECTION FOR WARM ORANGE GRADIENT UI ---
st.markdown(
    """
    <style>
    /* Global Background & Font Styling */
    .main { background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%); }
    
    /* Warm Orange Brand Headers */
    .brand-header {
        background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(234, 88, 12, 0.2);
    }
    
    /* Card Container Styling */
    .menu-card {
        background: white;
        border: 2px solid #fed7aa;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        margin-bottom: 12px;
    }
    
    /* Pill Buttons / Filters */
    .stButton>button {
        border-radius: 8px;
        font-weight: 600;
        background: #f97316;
        color: white;
        border: none;
    }
    .stButton>button:hover {
        background: #ea580c;
        color: white;
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
    }
    </style>
""",
    unsafe_allow_html=True,
)

# --- 1. SESSION STATE INITIALIZATION ---
if "menu" not in st.session_state:
  st.session_state.menu = [
      {
          "id": 1,
          "name": "Original Fried Chicken (1pc)",
          "category": "Chicken",
          "price": 79.0,
          "stock": 35,
          "restock": 10,
          "img": "🍗",
          "desc": "Crispy golden fried chicken, house brine w/ Java Rice & Gravy.",
      },
      {
          "id": 2,
          "name": "Chicken Teriyaki (1pc)",
          "category": "Chicken",
          "price": 85.0,
          "stock": 25,
          "restock": 10,
          "img": "🍱",
          "desc": "Savory glazed chicken with a sweet teriyaki finish w/ Java Rice.",
      },
      {
          "id": 3,
          "name": "Iced Tea (16oz)",
          "category": "Drinks",
          "price": 35.0,
          "stock": 50,
          "restock": 15,
          "img": "🧋",
          "desc": "House-brewed iced tea, refreshingly sweet.",
      },
      {
          "id": 4,
          "name": "Bottled Water",
          "category": "Drinks",
          "price": 20.0,
          "stock": 100,
          "restock": 20,
          "img": "💧",
          "desc": "Fresh mineral water.",
      },
      {
          "id": 5,
          "name": "Hungarian Sausage (1pc)",
          "category": "Meals",
          "price": 85.0,
          "stock": 14,
          "restock": 10,
          "img": "🌭",
          "desc": "Smoky hungarian sausage with savory gravy, w/ Java Rice & Egg.",
      },
      {
          "id": 6,
          "name": "Crispy Chicken Sandwich",
          "category": "Snacks",
          "price": 95.0,
          "stock": 0,
          "restock": 12,
          "img": "🍔",
          "desc": "Soon... Crispy chicken fillet with special signature sauce.",
      },
  ]

if "queue" not in st.session_state:
  st.session_state.queue = [
      {
          "id": 41,
          "source": "Web",
          "type": "Dine-In",
          "customer": "Student #2023-0192",
          "items": [{"name": "Original Fried Chicken (1pc)", "qty": 1}],
          "pay_status": "GCash Paid",
          "status": "Preparing",
          "time": "10:35 AM",
      },
      {
          "id": 40,
          "source": "Walk-In",
          "type": "Takeout",
          "customer": "Walk-in Guest",
          "items": [{"name": "Chicken Teriyaki (1pc)", "qty": 2}],
          "pay_status": "Cash on Pickup",
          "status": "Pending",
          "time": "10:38 AM",
      },
  ]

if "next_queue" not in st.session_state:
  st.session_state.next_queue = 42

if "cart" not in st.session_state:
  st.session_state.cart = {}

if "cust_screen" not in st.session_state:
  st.session_state.cust_screen = "menu"  # menu, cart, payment, tracking

if "active_tracking_id" not in st.session_state:
  st.session_state.active_tracking_id = None

if "category_filter" not in st.session_state:
  st.session_state.category_filter = "All"


# --- 2. SIDEBAR PERSPECTIVE SWITCHER ---
st.sidebar.markdown("### 🏫 Campus Chicken Portal")
st.sidebar.markdown(
    "<span style='background:#f97316; color:white; padding:3px 8px;"
    " border-radius:6px; font-weight:bold; font-size:11px;'>SmartStall TPS /"
    " MIS / DSS</span>",
    unsafe_allow_html=True,
)
st.sidebar.markdown("---")
view_mode = st.sidebar.radio(
    "Select System View:",
    ["Customer Mobile View", "Admin & Kitchen Dashboard"],
)


# =====================================================================
# MODULE A: CUSTOMER MOBILE VIEW (Matching Design Wireframes)
# =====================================================================
if view_mode == "Customer Mobile View":
  st.markdown(
      "<div style='max-width: 420px; margin: auto;'>", unsafe_allow_html=True
  )

  # Brand Header Bar
  st.markdown(
      """
        <div class="brand-header" style="text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">🍗 Campus Chicken SmartStall</h2>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #ffedd5;">Freshly fried. Smartly ordered. | Live Queue Active</p>
        </div>
    """,
      unsafe_allow_html=True,
  )

  total_cart_count = sum(i["qty"] for i in st.session_state.cart.values())
  total_cart_amount = sum(
      i["price"] * i["qty"] for i in st.session_state.cart.values()
  )

  # Cart notification banner
  if total_cart_count > 0:
    st.markdown(
        f"""
            <div style="background: #ffedd5; border: 1px solid #f97316; padding: 8px 12px; border-radius: 8px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span>You have <b>{total_cart_count} item(s)</b> in your cart. Head to Checkout when ready!</span>
            </div>
        """,
        unsafe_allow_html=True,
    )

  # SCREEN 1: MENU / DASHBOARD
  if st.session_state.cust_screen == "menu":
    st.markdown("### 📋 Today's Menu")

    # Category Pill Filter Buttons (All, Chicken, Drinks, Meals, Snacks)[cite: 2, 4]
    cat_cols = st.columns(5)
    categories = ["All", "Chicken", "Drinks", "Meals", "Snacks"]
    for idx, cat in enumerate(categories):
      if cat_cols[idx].button(cat, key=f"cat_btn_{cat}", use_container_width=True):
        st.session_state.category_filter = cat
        st.rerun()

    st.markdown(
        f"<p style='font-size: 11px; color: #c2410c;'>Showing category:"
        f" <b>{st.session_state.category_filter}</b></p>",
        unsafe_allow_html=True,
    )

    # Render Menu Items
    for item in st.session_state.menu:
      if (
          st.session_state.category_filter != "All"
          and item["category"] != st.session_state.category_filter
      ):
        continue

      with st.container():
        st.markdown(
            f"""
                <div class="menu-card">
                    <div style="font-size: 30px; float: left; margin-right: 12px;">{item['img']}</div>
                    <h4 style="margin: 0; color: #7c2d12; font-size: 15px;">{item['name']}</h4>
                    <p style="margin: 2px 0 6px 0; font-size: 11px; color: #475569;">{item['desc']}</p>
                    <b style="color: #ea580c; font-size: 14px;">₱{item['price']:.2f}</b>
                </div>
            """,
            unsafe_allow_html=True,
        )

        col_qty, col_add = st.columns([1, 1])
        if item["stock"] > 0:
          qty_to_add = col_qty.number_input(
              "Qty",
              min_value=1,
              max_value=item["stock"],
              value=1,
              key=f"m_qty_{item['id']}",
              label_visibility="collapsed",
          )
          if col_add.button(
              "Add +", key=f"m_add_{item['id']}", use_container_width=True
          ):
            if item["name"] in st.session_state.cart:
              st.session_state.cart[item["name"]]["qty"] += qty_to_add
            else:
              st.session_state.cart[item["name"]] = {
                  "price": item["price"],
                  "qty": qty_to_add,
              }
            st.toast(f"Added {qty_to_add}x {item['name']} to cart!")
            st.rerun()
        else:
          st.markdown(
              "<span style='color: red; font-size: 12px; font-weight: bold;'>Soon..."
              " Out of Stock</span>",
              unsafe_allow_html=True,
          )

    if total_cart_count > 0:
      if st.button("🛒 Go to Cart & Checkout", type="primary", use_container_width=True):
        st.session_state.cust_screen = "cart"
        st.rerun()

  # SCREEN 2: CART SCREEN
  elif st.session_state.cust_screen == "cart":
    if st.button("⬅ Back to Menu"):
      st.session_state.cust_screen = "menu"
      st.rerun()

    st.markdown("### 🛒 My Cart")
    if not st.session_state.cart:
      st.info("Your cart is empty.")
    else:
      for name, details in list(st.session_state.cart.items()):
        item_tot = details["price"] * details["qty"]
        c1, c2, c3 = st.columns([3, 2, 1])
        c1.write(f"**{name}**")
        c2.write(f"{details['qty']}x ₱{item_tot:.2f}")
        if c3.button("🗑️", key=f"c_del_{name}"):
          del st.session_state.cart[name]
          st.rerun()

      st.markdown("---")
      st.markdown(
          f"### Subtotal: <span style='color: #ea580c;'>₱{total_cart_amount:.2f}</span>",
          unsafe_allow_html=True,
      )

      if st.button("Proceed to Checkout ➡", type="primary", use_container_width=True):
        st.session_state.cust_screen = "payment"
        st.rerun()

  # SCREEN 3: CHECKOUT & PAYMENT METHOD SELECTOR
  elif st.session_state.cust_screen == "payment":
    if st.button("⬅ Back to Cart"):
      st.session_state.cust_screen = "cart"
      st.rerun()

    st.markdown("### 💳 Checkout & Payment")
    order_mode = st.radio("Order Type", ["Dine-In", "Takeout"])
    pay_method = st.radio(
        "Payment Method", ["Cash on Pickup", "GCash Online Payment"]
    )

    if pay_method == "Cash on Pickup":
      st.info(
          f"💵 **Cash Instruction:** Prepare exact amount **₱{total_cart_amount:.2f}**"
          " and present at Counter 1 upon order collection."
      )
    else:
      st.info(
          "📱 **GCash Gateway:** Confirming order will redirect you to secure"
          " GCash online payment processing."
      )

    if st.button("Confirm & Place Order ✔", type="primary", use_container_width=True):
      q_num = st.session_state.next_queue
      st.session_state.next_queue += 1

      new_order = {
          "id": q_num,
          "source": "Web",
          "type": order_mode,
          "customer": "Mobile Customer",
          "items": [
              {"name": k, "qty": v["qty"]} for k, v in st.session_state.cart.items()
          ],
          "pay_status": pay_method,
          "status": "Pending",
          "time": "Just now",
      }
      st.session_state.queue.insert(0, new_order)
      st.session_state.active_tracking_id = q_num
      st.session_state.cart = {}
      st.session_state.cust_screen = "tracking"
      st.rerun()

  # SCREEN 4: LIVE ORDER TRACKING SCREEN
  elif st.session_state.cust_screen == "tracking":
    q_id = st.session_state.active_tracking_id
    st.markdown(
        f"""
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 16px; text-align: center;">
            <span style="font-size: 11px; letter-spacing: 1px;">ASSIGNED QUEUE NUMBER</span>
            <h1 style="font-size: 40px; margin: 5px 0; color: #fef08a;">#{q_id}</h1>
            <span style="font-size: 11px; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 6px;">🤖 AI Dynamic Prep Time: ~4 mins</span>
        </div>
    """,
        unsafe_allow_html=True,
    )

    st.markdown("#### 📊 Real-Time Progress Tracker")
    ord_data = next((o for o in st.session_state.queue if o["id"] == q_id), None)
    status = ord_data["status"] if ord_data else "Completed"

    if status == "Pending":
      st.markdown("👉 **1. Order Pending & Acknowledged** \n⏳ 2. Preparing \n🔔 3. Ready")
    elif status == "Preparing":
      st.markdown("✅ 1. Pending \n👉 **2. Preparing in Kitchen (AI ETA: ~3m)** \n🔔 3. Ready")
    elif status == "Ready":
      st.markdown("✅ 1. Pending \n✅ 2. Preparing \n👉 **3. READY FOR PICKUP AT COUNTER 1!**")
    else:
      st.success("🎉 Order Completed!")

    if st.button("Place Another Order", use_container_width=True):
      st.session_state.cust_screen = "menu"
      st.rerun()

  st.markdown("</div>", unsafe_allow_html=True)


# =====================================================================
# MODULE B: ADMIN / KITCHEN DASHBOARD
# =====================================================================
else:
  st.markdown(
      """
        <div class="brand-header">
            <h2 style="margin: 0; font-size: 22px;">🖥️ Campus Chicken SmartStall - Admin & Kitchen Management Portal</h2>
        </div>
    """,
      unsafe_allow_html=True,
  )

  admin_tab = st.selectbox(
      "Select Dashboard Module:",
      [
          "Kitchen Display & Live Queue Kanban",
          "Stall Management & Inventory",
          "Sales & Financial DSS Dashboard",
          "System Administration & IoT Hub",
      ],
  )

  # --- 1. KITCHEN KANBAN DISPLAY ---
  if admin_tab == "Kitchen Display & Live Queue Kanban":
    st.subheader("Kitchen Display & Live Queue Dashboard (TPS + IoT)")

    pending_list = [o for o in st.session_state.queue if o["status"] == "Pending"]
    prep_list = [o for o in st.session_state.queue if o["status"] == "Preparing"]
    ready_list = [o for o in st.session_state.queue if o["status"] == "Ready"]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Pending Orders", len(pending_list))
    c2.metric("Preparing Orders", len(prep_list))
    c3.metric("Ready for Pickup", len(ready_list))
    c4.markdown(
        "<div style='background: #d1fae5; border: 1px solid #34d399; padding:"
        " 10px; border-radius: 8px; font-size: 11px; color: #065f46;'>🟢 IoT"
        " ESP32 Beeper & LED Hub: <b>CONNECTED</b></div>",
        unsafe_allow_html=True,
    )

    with st.expander("➕ Walk-In POS Order Modal (Counter Rapid Entry)"):
      with st.form("pos_form"):
        pos_type = st.radio("Order Type", ["Dine-In", "Takeout"], horizontal=True)
        pos_pay = st.selectbox(
            "Payment Status", ["Cash on Pickup", "GCash Paid"]
        )
        pos_cust = st.text_input("Customer Identifier", value="Walk-In Guest")
        pos_item = st.selectbox(
            "Select Dish Item", [i["name"] for i in st.session_state.menu]
        )
        pos_q = st.number_input("Quantity", min_value=1, value=1)
        if st.form_submit_button("Submit & Sync to Central Queue"):
          q_num = st.session_state.next_queue
          st.session_state.next_queue += 1
          st.session_state.queue.insert(
              0,
              {
                  "id": q_num,
                  "source": "Walk-In",
                  "type": pos_type,
                  "customer": pos_cust,
                  "items": [{"name": pos_item, "qty": pos_q}],
                  "pay_status": pos_pay,
                  "status": "Pending",
                  "time": "Just now",
              },
          )
          st.success(
              f"Walk-In order successfully injected as Queue #{q_num}!"
          )
          st.rerun()

    st.markdown("---")
    k1, k2, k3 = st.columns(3)

    with k1:
      st.markdown("### 🕒 Pending Column")
      for order in pending_list:
        with st.container(border=True):
          st.markdown(
              f"**Queue #{order['id']}** ({order['source']} |"
              f" {order['type']})"
          )
          st.caption(
              f"Customer: {order['customer']} | Pay: {order['pay_status']}"
          )
          for itm in order["items"]:
            st.write(f"- {itm['qty']}x {itm['name']}")
          if st.button("Accept / Start Prep ➡", key=f"k_acc_{order['id']}"):
            order["status"] = "Preparing"
            st.toast(
                f"[IoT Signal Sent]: Buzzer & LED triggered for Order"
                f" #{order['id']}!"
            )
            st.rerun()

    with k2:
      st.markdown("### 🔥 Preparing Column")
      for order in prep_list:
        with st.container(border=True):
          st.markdown(
              f"**Queue #{order['id']}** ({order['source']} |"
              f" {order['type']})"
          )
          st.caption(f"Customer: {order['customer']}")
          for itm in order["items"]:
            st.write(f"- {itm['qty']}x {itm['name']}")
          st.info("🤖 AI Predicted ETA Countdown: ~3 mins")
          if st.button("Mark as Ready 🔔", key=f"k_rdy_{order['id']}"):
            order["status"] = "Ready"
            st.toast(f"[IoT Signal Sent]: Ready buzzer sounded for Order #{order['id']}!")
            st.rerun()

    with k3:
      st.markdown("### 🔔 Ready for Pickup")
      for order in ready_list:
        with st.container(border=True):
          st.markdown(
              f"**Queue #{order['id']}** ({order['source']} |"
              f" {order['type']})"
          )
          st.caption(f"Customer: {order['customer']}")
          for itm in order["items"]:
            st.write(f"- {itm['qty']}x {itm['name']}")
          if st.button("Complete Order ✔", key=f"k_cmp_{order['id']}"):
            st.session_state.queue = [
                o for o in st.session_state.queue if o["id"] != order["id"]
            ]
            st.success(f"Order #{order['id']} completed.")
            st.rerun()

  # --- 2. INVENTORY MANAGEMENT ---
  elif admin_tab == "Stall Management & Inventory":
    st.subheader("Stall Management & Inventory Control Table (MIS)")

    with st.expander("+ Add / Edit Item Modal"):
      with st.form("inv_add"):
        i_name = st.text_input("Dish Name")
        i_cat = st.selectbox("Category", ["Chicken", "Drinks", "Meals", "Snacks"])
        i_price = st.number_input("Price (₱)", value=90.0)
        i_stock = st.number_input("Stock Count", value=30)
        if st.form_submit_button("Save Item"):
          st.session_state.menu.append({
              "id": len(st.session_state.menu) + 1,
              "name": i_name,
              "category": i_cat,
              "price": i_price,
              "stock": i_stock,
              "restock": 10,
              "img": "🍽️",
              "desc": "Newly added stall item.",
          })
          st.success("Item saved successfully!")
          st.rerun()

    st.markdown("### Inventory Control Table")
    for idx, item in enumerate(st.session_state.menu):
      col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 2])
      col1.write(f"**{item['img']} {item['name']}** ({item['category']})")
      col2.write(f"₱{item['price']:.2f}")
      col3.write(f"Stock: **{item['stock']}** (Restock @ {item['restock']})")

      new_s = col4.number_input(
          "Stock",
          value=item["stock"],
          key=f"inv_s_{item['id']}",
          label_visibility="collapsed",
      )
      if new_s != item["stock"]:
        item["stock"] = new_s

      if col5.button("Delete", key=f"inv_d_{item['id']}"):
        st.session_state.menu.pop(idx)
        st.rerun()

  # --- 3. SALES & FINANCIAL DSS ---
  elif admin_tab == "Sales & Financial DSS Dashboard":
    st.subheader("Sales & Financial Dashboard & Decision Support System (DSS)")
    sc1, sc2, sc3, sc4 = st.columns(4)
    sc1.metric("Total Revenue (Today)", "₱11,550.00", "+12%")
    sc2.metric("Orders Completed", "310 Orders", "+14.2%")
    sc3.metric("Best-Selling Item", "Chicken Garlic Butter w/ Java Rice", "Top")
    sc4.metric("🤖 AI Peak-Hour Forecast", "Peak @ 12:00 PM", "+40% load")

    st.markdown("---")
    st.write("### Hourly Sales Trend Graph & Category Shares")
    if st.button("📥 Download Sales Report (PDF / CSV)"):
      st.success("Sales report downloaded successfully!")

  # --- 4. SYSTEM ADMIN & IOT HUB ---
  elif admin_tab == "System Administration & IoT Hub":
    st.subheader("System Administration & IoT Hardware Integration")
    ac1, ac2 = st.columns(2)
    with ac1:
      st.markdown("#### User & Staff Management")
      st.write("- **Chef Juan** (Kitchen Staff) — Active")
      st.write("- **Maria** (Cashier / POS) — Active")
      st.write("- **Admin Master** (Stall Admin) — Active")
    with ac2:
      st.markdown("#### System Maintenance & IoT Panel")
      if st.button("Trigger Manual Database Backup"):
        st.success("Database backup generated and audit trail updated.")
      if st.button("Pair IoT ESP32 / Raspberry Pi Beeper Hub"):
        st.success("Paired successfully with kitchen hardware LEDs & buzzers!")