// Script untuk membuat user admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Delete existing admin if exists
    console.log('Checking for existing admin user...');
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { email: 'admin@example.com' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Deleting existing admin user:', existingAdmin.username);
      await prisma.user.delete({
        where: { id: existingAdmin.id }
      });
      console.log('Existing admin user deleted successfully');
    }

    // Create admin user with correct password
    console.log('Creating new admin user...');
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('Admin user created successfully:', adminUser.username);
    console.log('Password set to:', password);
  } catch (error) {
    console.error('Error managing admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 