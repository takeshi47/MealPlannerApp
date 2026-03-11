<?php

declare(strict_types=1);

namespace App\Tests\Repository;

use App\Entity\Menu;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class MenuRepositoryTest extends KernelTestCase
{
    protected AbstractDatabaseTool $databaseTool;
    private $repository;

    protected function setUp(): void
    {
        parent::setUp();
        self::bootKernel();

        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();
        $this->repository = self::getContainer()->get('doctrine')->getRepository(Menu::class);

        $projectDir = self::getContainer()->getParameter('kernel.project_dir');
        $this->databaseTool->loadAliceFixture([
            $projectDir.'/tests/Fixtures/ingredients.yaml',
            $projectDir.'/tests/Fixtures/menus.yaml',
            $projectDir.'/tests/Fixtures/dailies.yaml',
            $projectDir.'/tests/Fixtures/meals.yaml',
        ]);
    }

    public function testFindMenuByName(): void
    {
        /** @var Menu $menu */
        $menu = $this->repository->findOneBy(['name' => 'カレー']);

        $this->assertNotNull($menu);
        $this->assertSame('カレー', $menu->getName());

        // カレーには3つの材料（にんじん, たまねぎ, じゃがいも）が紐付いているはず
        $this->assertCount(3, $menu->getIngredients());

        // 材料名が含まれているか確認
        $ingredientNames = $menu->getIngredients()->map(fn ($i) => $i->getName())->toArray();
        $this->assertContains('にんじん', $ingredientNames);
        $this->assertContains('たまねぎ', $ingredientNames);
        $this->assertContains('じゃがいも', $ingredientNames);
    }

    public function testMenuWithFewerIngredients(): void
    {
        /** @var Menu $menu */
        $menu = $this->repository->findOneBy(['name' => '野菜炒め']);

        $this->assertNotNull($menu);
        $this->assertCount(2, $menu->getIngredients());
    }

    /**
     * isUsedInAnyMeal メソッドの判定テスト.
     */
    public function testIsUsedInAnyMeal(): void
    {
        // カレー (@menu_1) は Meal に紐付いている (meals.yaml で定義)
        $linkedMenu = $this->repository->findOneBy(['name' => 'カレー']);
        $this->assertTrue($this->repository->isUsedInAnyMeal($linkedMenu));

        // 削除用メニュー (@unlinked_menu) は Meal に紐付いていない
        $unlinkedMenu = $this->repository->findOneBy(['name' => '削除用メニュー']);
        $this->assertFalse($this->repository->isUsedInAnyMeal($unlinkedMenu));
    }
}
