<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\Ingredient;
use App\Entity\User;
use App\Tests\DataFixtures\AppFixtures;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class IngredientControllerTest extends WebTestCase
{
    private const ROUTE_PREFIX = '/api/ingredient';

    private KernelBrowser $client;
    private AbstractDatabaseTool $databaseTool;

    private string $csrfToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();

        // 1. テストデータの初期化 (Userを含む)
        $this->databaseTool->loadFixtures([AppFixtures::class]);

        // 2. テスト用ユーザーを取得してログイン状態にする
        $userRepository = self::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy(['email' => 'admin@example.com']);
        $this->client->loginUser($testUser);

        $this->client->jsonRequest('GET', self::ROUTE_PREFIX.'/csrf-token/ingredient_form');
        $this->csrfToken = $this->getResponseData()['token'];
    }

    /**
     * 一覧取得 (GET /api/ingredient) のテスト.
     */
    public function testIndex(): void
    {
        $this->client->jsonRequest('GET', self::ROUTE_PREFIX);

        $this->assertResponseIsSuccessful();
        $data = $this->getResponseData();
        $this->assertGreaterThanOrEqual(3, count($data));
    }

    /**
     * 新規作成 (POST /api/ingredient/new) のテスト.
     */
    public function testCreate(): void
    {
        // 新規作成リクエスト
        $this->client->jsonRequest(
            'POST',
            self::ROUTE_PREFIX.'/new',
            [
                'name' => 'テスト用しお',
                'isStock' => true,
                '_token' => $this->csrfToken,
            ]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'テスト用しお']);
        $this->assertNotNull($ingredient);
    }

    /**
     * 新規作成 (POST /api/ingredient/new) のバリデーションエラーテスト.
     */
    public function testCreateValidationError(): void
    {
        $this->client->jsonRequest(
            'POST',
            self::ROUTE_PREFIX.'/new',
            [
                'name' => '',
                'isStock' => true,
                '_token' => $this->csrfToken,
            ]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $data = $this->getResponseData();

        $this->assertArrayHasKey('name', $data);
        $this->assertTrue(in_array('This value should not be blank.', $data['name'], true));
    }

    /**
     * 新規作成 (POST /api/ingredient/new) のバリデーションエラーテスト.
     */
    public function testCreateDuplicateName(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $fetchedIngredient = $repo->findOneBy([]);

        $this->client->jsonRequest(
            'POST',
            self::ROUTE_PREFIX.'/new',
            [
                'name' => $fetchedIngredient->getName(),
                '_token' => $this->csrfToken,
            ]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        $data = $this->getResponseData();

        $this->assertArrayHasKey('name', $data);
        $this->assertContains('There is already an ingredient with this name', $data['name']);
    }

    /**
     * 編集 (POST /api/ingredient/edit/{id}) のテスト.
     */
    public function testEdit(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'にんじん']);
        $id = $ingredient->getId();

        $this->client->jsonRequest(
            'POST',
            self::ROUTE_PREFIX."/edit/$id",
            [
                'name' => 'にんじん（更新済み）',
                'isStock' => false,
                '_token' => $this->csrfToken,
            ]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        self::getContainer()->get('doctrine')->getManager()->clear();
        $updated = $repo->find($id);
        $this->assertSame('にんじん（更新済み）', $updated->getName());
        $this->assertFalse($updated->isStock());
    }

    /**
     * 編集 (POST /api/ingredient/edit/{id}) のテスト.
     */
    public function testEditValidationError(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'にんじん']);
        $id = $ingredient->getId();

        $this->client->jsonRequest(
            'POST',
            self::ROUTE_PREFIX."/edit/$id",
            [
                'name' => '',
                'isStock' => false,
                '_token' => $this->csrfToken,
            ]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $data = $this->getResponseData();

        $this->assertArrayHasKey('name', $data);
    }

    /**
     * 削除 (DELETE /api/ingredient/delete/{id}) の成功テスト.
     */
    public function testDeleteSuccess(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => '削除用材料']);
        $id = $ingredient->getId();

        $this->client->jsonRequest(
            'DELETE',
            self::ROUTE_PREFIX."/delete/$id",
            [],
            ['HTTP_X-CSRF-TOKEN' => $this->csrfToken]
        );

        $this->assertResponseIsSuccessful();

        self::getContainer()->get('doctrine')->getManager()->clear();
        $this->assertNull($repo->find($id));
    }

    /**
     * 削除 (DELETE /api/ingredient/delete/{id}) テスト(不正なCSRF tokenを使用する).
     */
    public function testDeleteForbidden(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy([]);
        $id = $ingredient->getId();

        $this->client->jsonRequest(
            'DELETE',
            self::ROUTE_PREFIX."/delete/$id",
            [],
            ['HTTP_X-CSRF-TOKEN' => 'csrf-token-wrong-123']
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        // 削除されていないことを確認する
        $this->assertNotNull($repo->findOneBy(['id' => $ingredient->getId()]));
    }

    /**
     * Menuに紐づいているIngredientは削除不可のテスト.
     */
    public function testDeleteLinkedToMenuFails(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'にんじん']);
        $id = $ingredient->getId();

        $this->client->jsonRequest(
            'DELETE',
            self::ROUTE_PREFIX."/delete/$id",
            [],
            ['HTTP_X-CSRF-TOKEN' => $this->csrfToken]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        $data = $this->getResponseData();
        $this->assertSame('この材料はメニューに紐付いているため削除できません。', $data['error']);

        // データベースから消えていないことを確認
        self::getContainer()->get('doctrine')->getManager()->clear();
        $this->assertNotNull($repo->find($id));
    }

    private function getResponseData(): mixed
    {
        return json_decode($this->client->getResponse()->getContent(), true);
    }
}
