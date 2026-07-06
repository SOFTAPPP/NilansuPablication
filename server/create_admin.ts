import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'aritradatt39@gmail.com'; // You can change this
  const password = 'Aritradutta@2005'; // You can change this

  console.log(`Checking if admin user exists (${email})...`);
  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('Admin user already exists!');
    return;
  }

  console.log('Creating new admin user...');
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user successfully created!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
