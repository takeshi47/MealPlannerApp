<?php

declare(strict_types=1);

namespace App\Tests\UseCase;

use App\Entity\Menu;
use App\Exception\MenuInUseException;
use App\UseCase\MenuDeleteUseCase;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class MenuDeleteUseCaseTest extends KernelTestCase
{
    private AbstractDatabaseTool $databaseTool;
    private MenuDeleteUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        self::bootKernel();

        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();
        $this->useCase = self::getContainer()->get(MenuDeleteUseCase::class);

        $projectDir = self::getContainer()->getParameter('kernel.project_dir');
        $this->databaseTool->loadAliceFixture([
            $projectDir.'/tests/Fixtures/ingredients.yaml',
            $projectDir.'/tests/Fixtures/menus.yaml',
            $projectDir.'/tests/Fixtures/meals.yaml',
        ]);
    }

    /**
     * Mealに紐づいているMenuは削除不可であることをテスト.
     */
    public function testDeleteLinkedMenuFails(): void
    {
        $repository = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repository->findOneBy(['name' => 'カレー']);
        $this->assertNotNull($menu);

        // 例外の発生を期待
        $this->expectException(MenuInUseException::class);
        $this->expectExceptionMessage('食事に使用されているため削除できません');

        // ユースケースを実行
        $this->useCase->delete($menu);
    }

    /**
     * Mealに紐づいていないMenuは削除可能であることをテスト.
     */
    public function testDeleteUnlinkedMenuSucceeds(): void
    {
        $repository = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repository->findOneBy(['name' => '削除用メニュー']);
        $this->assertNotNull($menu);
        $id = $menu->getId();

        // ユースケースを実行 (成功すれば例外は投げられない)
        $this->useCase->delete($menu);

        // データベースから消えていることを確認
        self::getContainer()->get('doctrine')->getManager()->clear();
        $this->assertNull($repository->find($id));
    }
}
