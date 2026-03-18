import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database...");

  await _seedCategories();
  await _seedDemoUsers();

  console.log("Seeding complete.");
}

async function _seedCategories(): Promise<void> {
  const categories = [
    { name: "Строители", type: "builders", children: ["Бригады", "Отделочники", "Электрики", "Сантехники", "Кровельщики", "Фасадчики", "Прочее"] },
    { name: "Материалы", type: "materials", children: ["Кирпич и блоки", "Бетон и цемент", "Пиломатериалы", "Кровельные материалы", "Отделочные материалы", "Инженерные системы", "Прочее"] },
    { name: "Земля и недвижимость", type: "land", children: ["Участки", "Дома", "Коммерческая недвижимость", "Прочее"] },
    { name: "Техника", type: "equipment", children: ["Экскаваторы", "Краны", "Самосвалы", "Бетононасосы", "Леса и опалубка", "Инструмент", "Прочее"] },
  ];

  for (const cat of categories) {
    const parentRecord =
      await prisma.category.findFirst({ where: { name: cat.name, type: cat.type, parentId: null } })
      ?? await prisma.category.create({ data: { name: cat.name, type: cat.type } });

    for (const childName of cat.children) {
      const existing = await prisma.category.findFirst({ where: { name: childName, parentId: parentRecord.id } });
      if (!existing) {
        await prisma.category.create({ data: { name: childName, type: cat.type, parentId: parentRecord.id } });
      }
    }
  }
}

async function _seedDemoUsers(): Promise<void> {
  const hash = await bcrypt.hash("demo123", 12);
  const adminHash = await bcrypt.hash("J,]trnsAdm321", 12);

  const demoUsers = [
    { email: "supplier@demo.ru", role: "supplier" as const, name: "СтройМатериалы Плюс", companyName: "ООО СтройМатериалы", description: "Поставка строительных материалов по всей России. Кирпич, блоки, бетон, цемент.", phone: "+79001234567" },
    { email: "builder@demo.ru", role: "builder" as const, name: "Бригада Мастеров", companyName: "ИП Иванов", description: "Строительство домов под ключ. Фундамент, кладка, кровля, отделка.", phone: "+79001234568" },
    { email: "equipment@demo.ru", role: "equipment" as const, name: "ТехРент", companyName: "ООО ТехноРент", description: "Аренда строительной техники: экскаваторы, краны, самосвалы.", phone: "+79001234569" },
    { email: "client@demo.ru", role: "client" as const, name: "Пётр Строитель", companyName: null, description: "Строю дом для семьи, ищу надёжных подрядчиков и поставщиков.", phone: "+79001234570" },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: { ...u, passwordHash: hash },
      });

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await prisma.subscription.create({
        data: { userId: user.id, plan: "premium", status: "active", expiresAt, autoRenew: false },
      });
    }
  }

  // Create moderator admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@stroitech.local" } });
  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@stroitech.local",
        phone: "+70000000000",
        passwordHash: adminHash,
        role: "moderator",
        name: "Администратор",
        region: "Москва",
        companyName: "Stroitech",
        description: "Системный модератор площадки.",
      },
    });

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);
    await prisma.subscription.create({
      data: { userId: adminUser.id, plan: "premium", status: "active", expiresAt, autoRenew: false },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
