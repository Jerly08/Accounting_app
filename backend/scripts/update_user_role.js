// Script to update user role to admin
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    // Update user with ID 4 to have admin role
    const updatedUser1 = await prisma.user.update({
      where: {
        id: 4
      },
      data: {
        role: 'admin'
      }
    });
    
    console.log('User 4 updated successfully:', updatedUser1);
    
    // Update user with ID 6 to have admin role
    const updatedUser2 = await prisma.user.update({
      where: {
        id: 6
      },
      data: {
        role: 'admin'
      }
    });
    
    console.log('User 6 updated successfully:', updatedUser2);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole(); 