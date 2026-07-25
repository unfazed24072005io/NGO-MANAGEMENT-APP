const admin = require('firebase-admin');

// Use Application Default Credentials
admin.initializeApp({
  projectId: 'ngo-app-54121'
});

const db = admin.firestore();

const createDocument = async (collection, data) => {
  const docRef = db.collection(collection).doc();
  await docRef.set(data);
  return docRef;
};

async function seedData() {
  console.log('🚀 Starting comprehensive data seeding...');

  try {
    // ==================== USERS ====================
    console.log('📝 Seeding users...');
    const users = [
      {
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '9876543210',
        address: '42, Green Valley Apartments, Mumbai',
        role: 'admin',
        status: 'active',
        level: 'platinum',
        commissionRate: 25,
        commissionEarned: 25000,
        registeredMembers: 12,
        totalDonations: 75000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Senior Administrator with 10+ years of NGO experience',
        designation: 'Executive Director',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date()
      },
      {
        fullName: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '9876543211',
        address: '15, Lake View Colony, Pune',
        role: 'workingMember',
        status: 'active',
        level: 'gold',
        commissionRate: 20,
        commissionEarned: 15000,
        registeredMembers: 8,
        totalDonations: 45000,
        promotionEligible: true,
        promotionPending: false,
        bio: 'Passionate about education and women empowerment',
        createdAt: new Date('2025-02-15'),
        updatedAt: new Date()
      },
      {
        fullName: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '9876543212',
        address: '88, Sector 12, Noida',
        role: 'workingMember',
        status: 'active',
        level: 'silver',
        commissionRate: 15,
        commissionEarned: 8000,
        registeredMembers: 5,
        totalDonations: 25000,
        promotionEligible: true,
        promotionPending: false,
        bio: 'Community organizer and youth mentor',
        createdAt: new Date('2025-03-10'),
        updatedAt: new Date()
      },
      {
        fullName: 'Sneha Reddy',
        email: 'sneha.reddy@example.com',
        phone: '9876543213',
        address: '56, Banjara Hills, Hyderabad',
        role: 'member',
        status: 'active',
        level: 'bronze',
        commissionRate: 10,
        commissionEarned: 2000,
        registeredMembers: 2,
        totalDonations: 5000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Volunteer and environmental activist',
        createdAt: new Date('2025-04-20'),
        updatedAt: new Date()
      },
      {
        fullName: 'Vikram Singh',
        email: 'vikram.singh@example.com',
        phone: '9876543214',
        address: '23, Rajput Colony, Jaipur',
        role: 'member',
        status: 'pending',
        level: 'bronze',
        commissionRate: 10,
        commissionEarned: 0,
        registeredMembers: 0,
        totalDonations: 0,
        promotionEligible: false,
        promotionPending: false,
        bio: 'New member waiting for approval',
        createdAt: new Date('2025-05-10'),
        updatedAt: new Date()
      },
      {
        fullName: 'Ananya Desai',
        email: 'ananya.desai@example.com',
        phone: '9876543215',
        address: '34, Koregaon Park, Pune',
        role: 'workingMember',
        status: 'active',
        level: 'platinum',
        commissionRate: 25,
        commissionEarned: 32000,
        registeredMembers: 15,
        totalDonations: 95000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Healthcare and nutrition specialist',
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date()
      },
      {
        fullName: 'Karan Mehta',
        email: 'karan.mehta@example.com',
        phone: '9876543216',
        address: '67, Juhu Beach, Mumbai',
        role: 'member',
        status: 'active',
        level: 'silver',
        commissionRate: 15,
        commissionEarned: 5000,
        registeredMembers: 3,
        totalDonations: 15000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Tech professional and social worker',
        createdAt: new Date('2025-03-25'),
        updatedAt: new Date()
      },
      {
        fullName: 'Maya Krishnan',
        email: 'maya.krishnan@example.com',
        phone: '9876543217',
        address: '12, Alwarpet, Chennai',
        role: 'admin',
        status: 'active',
        level: 'platinum',
        commissionRate: 30,
        commissionEarned: 50000,
        registeredMembers: 20,
        totalDonations: 150000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Chief Operating Officer with 15 years of experience',
        designation: 'COO',
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date()
      },
      {
        fullName: 'Arjun Nair',
        email: 'arjun.nair@example.com',
        phone: '9876543218',
        address: '89, Marine Drive, Kochi',
        role: 'workingMember',
        status: 'suspended',
        level: 'bronze',
        commissionRate: 10,
        commissionEarned: 1000,
        registeredMembers: 1,
        totalDonations: 3000,
        promotionEligible: false,
        promotionPending: false,
        bio: 'Temporarily suspended pending review',
        createdAt: new Date('2025-04-15'),
        updatedAt: new Date()
      },
      {
        fullName: 'Divya Sharma',
        email: 'divya.sharma@example.com',
        phone: '9876543219',
        address: '45, Indiranagar, Bangalore',
        role: 'member',
        status: 'active',
        level: 'gold',
        commissionRate: 20,
        commissionEarned: 12000,
        registeredMembers: 6,
        totalDonations: 35000,
        promotionEligible: true,
        promotionPending: false,
        bio: 'Education activist and fundraiser',
        createdAt: new Date('2025-02-28'),
        updatedAt: new Date()
      }
    ];

    for (const user of users) {
      await createDocument('users', user);
    }
    console.log(`✅ Added ${users.length} users`);

    // ==================== PRODUCTS ====================
    console.log('📝 Seeding products...');
    const products = [
      {
        name: 'NGO T-Shirt (Cotton)',
        description: 'High quality 100% cotton t-shirt with NGO logo. Available in S, M, L, XL.',
        price: 499,
        category: 'Clothing',
        stock: 150,
        images: ['https://via.placeholder.com/200'],
        featured: true,
        discount: 10,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Eco-Friendly Water Bottle',
        description: 'Stainless steel, BPA-free water bottle. 750ml capacity.',
        price: 799,
        category: 'Accessories',
        stock: 85,
        images: ['https://via.placeholder.com/200'],
        featured: true,
        discount: 15,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Handmade Notebook (Set of 3)',
        description: 'Eco-friendly handmade paper notebooks with recycled covers.',
        price: 399,
        category: 'Books',
        stock: 60,
        images: ['https://via.placeholder.com/200'],
        featured: false,
        discount: 5,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'NGO Canvas Bag',
        description: 'Durable canvas bag with NGO mission statement. Perfect for everyday use.',
        price: 599,
        category: 'Accessories',
        stock: 120,
        images: ['https://via.placeholder.com/200'],
        featured: true,
        discount: 20,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Organic Cotton Scarf',
        description: 'Handwoven organic cotton scarf with traditional design.',
        price: 899,
        category: 'Clothing',
        stock: 40,
        images: ['https://via.placeholder.com/200'],
        featured: false,
        discount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Bamboo Cutlery Set',
        description: 'Eco-friendly bamboo cutlery set with carrying pouch.',
        price: 349,
        category: 'Food',
        stock: 95,
        images: ['https://via.placeholder.com/200'],
        featured: false,
        discount: 10,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Solar Powered Lantern',
        description: 'Portable solar-powered LED lantern with USB charging.',
        price: 1299,
        category: 'Accessories',
        stock: 30,
        images: ['https://via.placeholder.com/200'],
        featured: true,
        discount: 25,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'NGO Book: Stories of Change',
        description: 'Compilation of inspiring stories from the NGO community.',
        price: 299,
        category: 'Books',
        stock: 200,
        images: ['https://via.placeholder.com/200'],
        featured: false,
        discount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const product of products) {
      await createDocument('products', product);
    }
    console.log(`✅ Added ${products.length} products`);

    // ==================== EVENTS ====================
    console.log('📝 Seeding events...');
    const events = [
      {
        title: 'Annual Charity Gala Dinner',
        description: 'Join us for an evening of elegance and philanthropy. Support our cause!',
        date: new Date('2026-08-15'),
        time: '7:00 PM',
        location: 'Grand Hyatt, Mumbai',
        venue: 'Grand Ballroom',
        category: 'Fundraiser',
        capacity: 500,
        registeredCount: 320,
        image: 'https://via.placeholder.com/400x200',
        status: 'upcoming',
        featured: true,
        organizer: 'Event Committee',
        contactEmail: 'events@ngoapp.com',
        contactPhone: '9876543220',
        agenda: ['Welcome Speech', 'Keynote Address', 'Dinner', 'Auction', 'Closing'],
        speakers: ['Dr. A.P. Singh', 'Ms. Priya Patel', 'Mr. Rajesh Kumar'],
        tags: ['fundraiser', 'gala', 'charity'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Community Health Camp',
        description: 'Free health checkup camp for underprivileged communities.',
        date: new Date('2026-08-20'),
        time: '9:00 AM',
        location: 'Community Center, Dharavi',
        venue: 'Dharavi Community Hall',
        category: 'Healthcare',
        capacity: 200,
        registeredCount: 145,
        image: 'https://via.placeholder.com/400x200',
        status: 'upcoming',
        featured: false,
        organizer: 'Health Team',
        contactEmail: 'health@ngoapp.com',
        contactPhone: '9876543221',
        agenda: ['Registration', 'Health Checkup', 'Awareness Session'],
        speakers: ['Dr. Priya Patel', 'Dr. Rajesh Kumar'],
        tags: ['health', 'community', 'free-camp'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Online Education Seminar',
        description: 'Virtual seminar on transforming education through technology.',
        date: new Date('2026-08-25'),
        time: '11:00 AM',
        location: 'Online (Zoom)',
        venue: 'Virtual',
        category: 'Education',
        capacity: 1000,
        registeredCount: 780,
        image: 'https://via.placeholder.com/400x200',
        status: 'upcoming',
        featured: true,
        organizer: 'Education Committee',
        contactEmail: 'education@ngoapp.com',
        contactPhone: '9876543222',
        agenda: ['Opening', 'Panel Discussion', 'Q&A', 'Closing'],
        speakers: ['Dr. Ananya Desai', 'Ms. Sneha Reddy', 'Mr. Vikram Singh'],
        tags: ['education', 'online', 'seminar'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Tree Plantation Drive',
        description: 'Plant 10,000 trees across the city. Join us for a green future!',
        date: new Date('2026-08-10'),
        time: '6:00 AM',
        location: 'Various locations across city',
        venue: 'Multiple sites',
        category: 'Environment',
        capacity: 300,
        registeredCount: 210,
        image: 'https://via.placeholder.com/400x200',
        status: 'ongoing',
        featured: false,
        organizer: 'Environment Team',
        contactEmail: 'environment@ngoapp.com',
        contactPhone: '9876543223',
        agenda: ['Registration', 'Distribution', 'Planting', 'Refreshments'],
        speakers: ['Mr. Arjun Nair', 'Ms. Maya Krishnan'],
        tags: ['environment', 'plantation', 'green'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Women Empowerment Conference',
        description: 'Annual conference celebrating women achievers and discussing empowerment.',
        date: new Date('2026-07-15'),
        time: '10:00 AM',
        location: 'Convention Center, Delhi',
        venue: 'Hall A',
        category: 'Social Cause',
        capacity: 800,
        registeredCount: 650,
        image: 'https://via.placeholder.com/400x200',
        status: 'completed',
        featured: true,
        organizer: 'Women\'s Wing',
        contactEmail: 'women@ngoapp.com',
        contactPhone: '9876543224',
        agenda: ['Inauguration', 'Keynote', 'Panel Discussions', 'Awards'],
        speakers: ['Dr. A.P. Singh', 'Ms. Priya Patel', 'Ms. Sneha Reddy'],
        tags: ['women', 'empowerment', 'conference'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Food Distribution Drive',
        description: 'Distribute food packets to 5,000 families in need.',
        date: new Date('2026-09-01'),
        time: '8:00 AM',
        location: 'Community Centers across city',
        venue: 'Multiple locations',
        category: 'Food Relief',
        capacity: 200,
        registeredCount: 150,
        image: 'https://via.placeholder.com/400x200',
        status: 'upcoming',
        featured: false,
        organizer: 'Food Relief Team',
        contactEmail: 'food@ngoapp.com',
        contactPhone: '9876543225',
        agenda: ['Packing', 'Distribution', 'Awareness'],
        speakers: ['Mr. Karan Mehta', 'Ms. Divya Sharma'],
        tags: ['food', 'relief', 'distribution'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const event of events) {
      await createDocument('events', event);
    }
    console.log(`✅ Added ${events.length} events`);

    // ==================== DONATIONS ====================
    console.log('📝 Seeding donations...');
    const donations = [
      {
        donorName: 'Rajesh Kumar',
        donorEmail: 'rajesh.kumar@example.com',
        phone: '9876543226',
        amount: 10000,
        purpose: 'Education',
        message: 'Hope this helps educate young minds.',
        paymentMethod: 'razorpay',
        status: 'completed',
        anonymous: false,
        createdAt: new Date('2026-07-10'),
        updatedAt: new Date()
      },
      {
        donorName: 'Sushmita Sen',
        donorEmail: 'sushmita.sen@example.com',
        phone: '9876543227',
        amount: 25000,
        purpose: 'Medical',
        message: 'For healthcare of underprivileged children.',
        paymentMethod: 'upi',
        status: 'completed',
        anonymous: false,
        createdAt: new Date('2026-07-15'),
        updatedAt: new Date()
      },
      {
        donorName: 'Anonymous Donor',
        donorEmail: 'anonymous@example.com',
        phone: '9876543228',
        amount: 15000,
        purpose: 'General',
        message: 'Keep up the good work!',
        paymentMethod: 'card',
        status: 'completed',
        anonymous: true,
        createdAt: new Date('2026-07-20'),
        updatedAt: new Date()
      },
      {
        donorName: 'Meera Patel',
        donorEmail: 'meera.patel@example.com',
        phone: '9876543229',
        amount: 5000,
        purpose: 'Food',
        message: 'For the food distribution drive.',
        paymentMethod: 'razorpay',
        status: 'completed',
        anonymous: false,
        createdAt: new Date('2026-07-25'),
        updatedAt: new Date()
      },
      {
        donorName: 'Sunil Gupta',
        donorEmail: 'sunil.gupta@example.com',
        phone: '9876543230',
        amount: 20000,
        purpose: 'Emergency Relief',
        message: 'For immediate relief efforts.',
        paymentMethod: 'bank',
        status: 'pending',
        anonymous: false,
        createdAt: new Date('2026-07-28'),
        updatedAt: new Date()
      },
      {
        donorName: 'Nisha Singh',
        donorEmail: 'nisha.singh@example.com',
        phone: '9876543231',
        amount: 30000,
        purpose: 'Education',
        message: 'For building new classrooms.',
        paymentMethod: 'razorpay',
        status: 'completed',
        anonymous: false,
        createdAt: new Date('2026-07-30'),
        updatedAt: new Date()
      }
    ];

    for (const donation of donations) {
      await createDocument('donations', donation);
    }
    console.log(`✅ Added ${donations.length} donations`);

    // ==================== ORDERS ====================
    console.log('📝 Seeding orders...');
    const orders = [
      {
        customerName: 'Rajesh Kumar',
        customerEmail: 'rajesh.kumar@example.com',
        customerPhone: '9876543226',
        deliveryAddress: '42, Green Valley Apartments, Mumbai',
        paymentMethod: 'razorpay',
        items: [
          { name: 'NGO T-Shirt (Cotton)', price: 499, quantity: 2, total: 998 },
          { name: 'Eco-Friendly Water Bottle', price: 799, quantity: 1, total: 799 }
        ],
        subtotal: 1797,
        deliveryCharges: 50,
        total: 1847,
        status: 'completed',
        createdAt: new Date('2026-07-11'),
        updatedAt: new Date()
      },
      {
        customerName: 'Sushmita Sen',
        customerEmail: 'sushmita.sen@example.com',
        customerPhone: '9876543227',
        deliveryAddress: '15, Lake View Colony, Pune',
        paymentMethod: 'upi',
        items: [
          { name: 'Handmade Notebook (Set of 3)', price: 399, quantity: 3, total: 1197 },
          { name: 'NGO Canvas Bag', price: 599, quantity: 2, total: 1198 }
        ],
        subtotal: 2395,
        deliveryCharges: 50,
        total: 2445,
        status: 'processing',
        createdAt: new Date('2026-07-18'),
        updatedAt: new Date()
      },
      {
        customerName: 'Meera Patel',
        customerEmail: 'meera.patel@example.com',
        customerPhone: '9876543229',
        deliveryAddress: '56, Banjara Hills, Hyderabad',
        paymentMethod: 'cash',
        items: [
          { name: 'Bamboo Cutlery Set', price: 349, quantity: 5, total: 1745 },
          { name: 'Solar Powered Lantern', price: 1299, quantity: 1, total: 1299 }
        ],
        subtotal: 3044,
        deliveryCharges: 50,
        total: 3094,
        status: 'pending',
        createdAt: new Date('2026-07-22'),
        updatedAt: new Date()
      },
      {
        customerName: 'Karan Mehta',
        customerEmail: 'karan.mehta@example.com',
        customerPhone: '9876543216',
        deliveryAddress: '67, Juhu Beach, Mumbai',
        paymentMethod: 'card',
        items: [
          { name: 'NGO T-Shirt (Cotton)', price: 499, quantity: 1, total: 499 },
          { name: 'NGO Book: Stories of Change', price: 299, quantity: 2, total: 598 }
        ],
        subtotal: 1097,
        deliveryCharges: 50,
        total: 1147,
        status: 'cancelled',
        createdAt: new Date('2026-07-25'),
        updatedAt: new Date()
      },
      {
        customerName: 'Ananya Desai',
        customerEmail: 'ananya.desai@example.com',
        customerPhone: '9876543215',
        deliveryAddress: '34, Koregaon Park, Pune',
        paymentMethod: 'razorpay',
        items: [
          { name: 'Eco-Friendly Water Bottle', price: 799, quantity: 4, total: 3196 },
          { name: 'Organic Cotton Scarf', price: 899, quantity: 2, total: 1798 }
        ],
        subtotal: 4994,
        deliveryCharges: 50,
        total: 5044,
        status: 'completed',
        createdAt: new Date('2026-07-28'),
        updatedAt: new Date()
      }
    ];

    for (const order of orders) {
      await createDocument('orders', order);
    }
    console.log(`✅ Added ${orders.length} orders`);

    // ==================== NOTICES ====================
    console.log('📝 Seeding notices...');
    const notices = [
      {
        title: 'Important: New Member Registration Process',
        description: 'We have updated the member registration process. All new members must submit their identity documents and complete the verification process.',
        category: 'Announcement',
        priority: 'high',
        status: 'active',
        targetAudience: 'all',
        type: 'notice',
        createdByName: 'Admin Team',
        createdAt: new Date('2026-07-01'),
        updatedAt: new Date()
      },
      {
        title: 'Upcoming Event: Charity Gala Dinner',
        description: 'Don\'t miss our annual Charity Gala Dinner on August 15th! Limited seats available.',
        category: 'Event',
        priority: 'high',
        status: 'active',
        targetAudience: 'all',
        type: 'notice',
        createdByName: 'Admin Team',
        createdAt: new Date('2026-07-05'),
        updatedAt: new Date()
      },
      {
        title: 'New Products Added to Shop',
        description: 'We have added new eco-friendly products to our shop.',
        category: 'Shop',
        priority: 'medium',
        status: 'active',
        targetAudience: 'members',
        type: 'notice',
        createdByName: 'Admin Team',
        createdAt: new Date('2026-07-10'),
        updatedAt: new Date()
      },
      {
        title: 'Volunteer Opportunity: Health Camp',
        description: 'We are looking for volunteers for our upcoming Community Health Camp on August 20th.',
        category: 'Volunteer',
        priority: 'medium',
        status: 'active',
        targetAudience: 'workingMembers',
        type: 'notice',
        createdByName: 'Admin Team',
        createdAt: new Date('2026-07-15'),
        updatedAt: new Date()
      },
      {
        title: 'Monthly Report: June 2026',
        description: 'We have published our monthly report for June.',
        category: 'Report',
        priority: 'low',
        status: 'closed',
        targetAudience: 'all',
        type: 'notice',
        createdByName: 'Admin Team',
        createdAt: new Date('2026-07-20'),
        updatedAt: new Date()
      }
    ];

    for (const notice of notices) {
      await createDocument('notices', notice);
    }
    console.log(`✅ Added ${notices.length} notices`);

    // ==================== COMPLAINTS ====================
    console.log('📝 Seeding complaints...');
    const complaints = [
      {
        title: 'Issue with Order Delivery',
        description: 'I placed an order on July 22nd but have not received it yet.',
        category: 'Delivery',
        priority: 'high',
        status: 'pending',
        type: 'complaint',
        createdByName: 'Meera Patel',
        createdAt: new Date('2026-07-23'),
        updatedAt: new Date()
      },
      {
        title: 'Website Login Problem',
        description: 'I am unable to log into the website since yesterday.',
        category: 'Technical',
        priority: 'high',
        status: 'resolved',
        type: 'complaint',
        createdByName: 'Karan Mehta',
        createdAt: new Date('2026-07-21'),
        updatedAt: new Date()
      },
      {
        title: 'Event Registration Issue',
        description: 'I registered for the Women Empowerment Conference but did not receive a confirmation email.',
        category: 'Event',
        priority: 'medium',
        status: 'pending',
        type: 'complaint',
        createdByName: 'Ananya Desai',
        createdAt: new Date('2026-07-18'),
        updatedAt: new Date()
      },
      {
        title: 'Payment Not Reflected',
        description: 'I donated ₹20,000 on July 28th but it\'s not showing in my donation history.',
        category: 'Payment',
        priority: 'high',
        status: 'resolved',
        type: 'complaint',
        createdByName: 'Sunil Gupta',
        createdAt: new Date('2026-07-29'),
        updatedAt: new Date()
      },
      {
        title: 'Product Quality Issue',
        description: 'The NGO T-Shirt I received has a printing defect.',
        category: 'Product',
        priority: 'medium',
        status: 'pending',
        type: 'complaint',
        createdByName: 'Sushmita Sen',
        createdAt: new Date('2026-07-20'),
        updatedAt: new Date()
      }
    ];

    for (const complaint of complaints) {
      await createDocument('complaints', complaint);
    }
    console.log(`✅ Added ${complaints.length} complaints`);

    // ==================== SUGGESTIONS ====================
    console.log('📝 Seeding suggestions...');
    const suggestions = [
      {
        title: 'Add Dark Mode Support',
        description: 'It would be great if the app could have dark mode support.',
        category: 'Feature',
        priority: 'low',
        status: 'pending',
        type: 'suggestion',
        createdByName: 'Divya Sharma',
        createdAt: new Date('2026-07-25'),
        updatedAt: new Date()
      },
      {
        title: 'Introduce Monthly Subscription',
        description: 'Consider introducing a monthly subscription model for regular donors.',
        category: 'Donation',
        priority: 'medium',
        status: 'pending',
        type: 'suggestion',
        createdByName: 'Ananya Desai',
        createdAt: new Date('2026-07-22'),
        updatedAt: new Date()
      },
      {
        title: 'Improve Search Feature',
        description: 'The search functionality on the shop page could be improved with filters.',
        category: 'Feature',
        priority: 'medium',
        status: 'resolved',
        type: 'suggestion',
        createdByName: 'Sushmita Sen',
        createdAt: new Date('2026-07-19'),
        updatedAt: new Date()
      },
      {
        title: 'Add Real-time Chat Support',
        description: 'Implement a live chat feature for users to get instant support.',
        category: 'Support',
        priority: 'high',
        status: 'pending',
        type: 'suggestion',
        createdByName: 'Rajesh Kumar',
        createdAt: new Date('2026-07-27'),
        updatedAt: new Date()
      }
    ];

    for (const suggestion of suggestions) {
      await createDocument('suggestions', suggestion);
    }
    console.log(`✅ Added ${suggestions.length} suggestions`);

    // ==================== COMPANY PROFILE ====================
    console.log('📝 Seeding company profile...');
    await db.collection('company').doc('profile').set({
      companyName: 'NGO Foundation',
      tagline: 'Empowering Communities, Changing Lives',
      description: 'NGO Foundation is a non-profit organization dedicated to empowering underprivileged communities.',
      mission: 'To empower communities and create sustainable change through education, healthcare, and social welfare programs.',
      vision: 'A world where every individual has access to quality education, healthcare, and opportunities.',
      email: 'contact@ngofoundation.org',
      phone: '+91 98765 43210',
      address: '123, NGO Road, New Delhi - 110001, India',
      website: 'https://www.ngofoundation.org',
      socialMedia: {
        facebook: 'https://facebook.com/ngofoundation',
        instagram: 'https://instagram.com/ngofoundation',
        twitter: 'https://twitter.com/ngofoundation',
        linkedin: 'https://linkedin.com/company/ngofoundation'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Added company profile');

    // ==================== BOARD MEMBERS ====================
    console.log('📝 Seeding board members...');
    const boardMembers = [
      {
        name: 'Dr. A.P. Singh',
        position: 'Chairman',
        bio: 'Renowned social activist and educationist with 30+ years of experience.',
        photo: 'https://via.placeholder.com/100',
        createdAt: new Date()
      },
      {
        name: 'Ms. Priya Patel',
        position: 'Vice Chairperson',
        bio: 'Healthcare professional and women\'s rights advocate.',
        photo: 'https://via.placeholder.com/100',
        createdAt: new Date()
      },
      {
        name: 'Mr. Rajesh Kumar',
        position: 'Treasurer',
        bio: 'Financial expert with 20+ years in non-profit finance management.',
        photo: 'https://via.placeholder.com/100',
        createdAt: new Date()
      },
      {
        name: 'Ms. Sneha Reddy',
        position: 'Secretary',
        bio: 'Environmental activist and community organizer.',
        photo: 'https://via.placeholder.com/100',
        createdAt: new Date()
      }
    ];

    for (const member of boardMembers) {
      await createDocument('boardMembers', member);
    }
    console.log(`✅ Added ${boardMembers.length} board members`);

    console.log('\n🎉 Data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - ${users.length} Users`);
    console.log(`  - ${products.length} Products`);
    console.log(`  - ${events.length} Events`);
    console.log(`  - ${donations.length} Donations`);
    console.log(`  - ${orders.length} Orders`);
    console.log(`  - ${notices.length} Notices`);
    console.log(`  - ${complaints.length} Complaints`);
    console.log(`  - ${suggestions.length} Suggestions`);
    console.log(`  - ${boardMembers.length} Board Members`);
    console.log('  - 1 Company Profile');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
}

// Run the seed function
seedData();