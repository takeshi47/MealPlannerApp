<?php

declare(strict_types=1);

namespace App\Tests\Repository;

use App\Entity\Ingredient;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class IngredientRepositoryTest extends KernelTestCase
{
    /** @var AbstractDatabaseTool */
    protected $databaseTool;
    private $repository;

    protected function setUp(): void
    {
        parent::setUp();
        self::bootKernel();

        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();
        $this->repository = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);

        $this->databaseTool->loadAliceFixture([
            self::getContainer()->getParameter('kernel.project_dir').'/tests/Fixtures/ingredients.yaml',
        ]);
    }

    public function testFindIngredientFromYaml(): void
    {
        $ingredient = $this->repository->findOneBy(['name' => 'にんじん']);

        $this->assertNotNull($ingredient);
        $this->assertSame('にんじん', $ingredient->getName());
        $this->assertTrue($ingredient->isStock());
    }

    public function testRangeDataFromYaml(): void
    {
        // 範囲指定で作った「テスト材料 4」を探す
        $ingredient = $this->repository->findOneBy(['name' => 'テスト材料 4']);
        $this->assertNotNull($ingredient);
    }
}
