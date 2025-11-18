/**
 * Clean invalid contract addresses from database
 * Valid addresses must:
 * - Start with 0x
 * - Have exactly 42 characters (0x + 40 hex chars)
 * - Only contain hex characters (0-9, a-f, A-F)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanInvalidContracts() {
  console.log("🧹 Cleaning invalid contract addresses...\n");

  try {
    // Find invalid contracts
    const allContracts = await prisma.monvisionContract.findMany({
      select: {
        id: true,
        address: true,
        name: true,
        dapp: {
          select: {
            name: true,
          },
        },
      },
    });

    const invalidContracts = allContracts.filter((c) => {
      const isValid =
        c.address &&
        c.address.toLowerCase().startsWith("0x") &&
        c.address.length === 42 &&
        /^0x[a-fA-F0-9]{40}$/.test(c.address);
      return !isValid;
    });

    console.log(`📊 Total contracts: ${allContracts.length}`);
    console.log(`❌ Invalid contracts: ${invalidContracts.length}\n`);

    if (invalidContracts.length === 0) {
      console.log("✅ No invalid contracts found!");
      return;
    }

    console.log("Invalid contracts found:");
    invalidContracts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.address}`);
      console.log(`     Name: ${c.name || "N/A"}`);
      console.log(`     DApp: ${c.dapp?.name || "N/A"}`);
    });

    console.log("\n🗑️  Deleting invalid contracts...");

    const result = await prisma.monvisionContract.deleteMany({
      where: {
        id: {
          in: invalidContracts.map((c) => c.id),
        },
      },
    });

    console.log(`✅ Deleted ${result.count} invalid contracts`);

    // Verify
    const remainingContracts = await prisma.monvisionContract.count();
    console.log(`\n📊 Remaining contracts: ${remainingContracts}`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanInvalidContracts().catch(console.error);
