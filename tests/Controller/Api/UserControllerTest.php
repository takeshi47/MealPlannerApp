<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\User;
use App\Tests\DataFixtures\AppFixtures;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class UserControllerTest extends WebTestCase
{
    public const ROUTE_PREFIX = '/api/user';

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

        $this->client->request('GET', self::ROUTE_PREFIX.'/csrf-token/user_create');
        $this->csrfToken = $this->getResponseData()['token'];
    }

    /**
     * 1. データのシリアライズテスト(passwordがシリアライズされていないことを確認).
     */
    public function testIndexSerialization(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $this->client->jsonRequest('GET', self::ROUTE_PREFIX.'/'.$testUser->getId());
        $this->assertResponseIsSuccessful();

        $user = $this->getResponseData();

        $this->assertArrayHasKey('email', $user);
        $this->assertArrayHasKey('displayName', $user);
        $this->assertArrayHasKey('role', $user);

        $this->assertArrayNotHasKey('password', $user);
        $this->assertArrayNotHasKey('plainPassword', $user);
    }

    /**
     * 2.1 新規作成時の成功ケースをテストする.
     */
    public function testCreateSuccess(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);

        $validPayload = [
            'email' => 'admin99@example.com',
            'plainPassword' => [
                'first' => 'password123',
                'second' => 'password123',
            ],
            'role' => 'ROLE_USER',
            '_token' => $this->csrfToken,
        ];

        $this->client->jsonRequest('POST', self::ROUTE_PREFIX.'/new', $validPayload);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertSame(null, $this->getResponseData());

        // DBに登録されていることを確認
        $this->assertNotNull($userRepository->findOneBy(['email' => 'admin99@example.com']));
    }

    /**
     * 2.2 バリデーションエラー時のレスポンス形式をテストする.
     */
    public function testCreateValidationErrorFormatting(): void
    {
        $invalidPayload = [
            'email' => 'admin99@example.com',
            'plainPassword' => [
                'first' => 'short',
                'second' => 'short',
            ],
            'role' => '',
        ];
        $this->client->jsonRequest('POST', self::ROUTE_PREFIX.'/new', $invalidPayload);

        // 1. JSON レスポンスを配列にデコードする
        $data = $this->getResponseData();

        // 2. ステータスコードの確認（Bad Request になってるはず！）
        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        // 3. ここが一番大事！「ドット入りのキー」が配列のトップレベルにあるか確認
        $this->assertArrayHasKey('plainPassword.first', $data, 'エラーメッセージのキーは "plainPassword.first" (フラット) であるべきやで！');

        // 4. メッセージの中身もチェックしておくと完璧やね
        $this->assertIsArray($data['plainPassword.first']);
        $this->assertContains('This value is too short. It should have 8 characters or more.', $data['plainPassword.first']);
    }

    /**
     * 2.3 「メールアドレス重複」のバリデーションテスト.
     */
    public function testCreateDuplicateEmail(): void
    {
        $validPayload = [
            'email' => 'admin@example.com',
            'role' => 'ROLE_USER',
            'plainPassword' => [
                'first' => '',
                'second' => '',
            ],
            '_token' => $this->csrfToken,
        ];

        $this->client->jsonRequest('POST', self::ROUTE_PREFIX.'/new', $validPayload);
        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $errors = $this->getResponseData();

        $this->assertArrayHasKey('email', $errors);
        $this->assertTrue(in_array('There is already an account with this email', $errors['email'], true));
    }

    /**
     * 3.1 編集（Edit）成功ケースと「DB反映」確認.
     */
    public function testEdit(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);
        $testUserId = $testUser->getId();
        $updateEmail = 'updated@example.com';

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $validPayload = [
            'email' => $updateEmail,
            'role' => 'ROLE_USER',
            'plainPassword' => [
                'first' => '',
                'second' => '',
            ],
            '_token' => $this->csrfToken,
        ];

        $this->client->jsonRequest('POST', self::ROUTE_PREFIX."/{$testUserId}", $validPayload);
        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $this->client->getContainer()->get('doctrine')->getManager()->clear();

        $testUser = $userRepository->findOneById($testUserId);
        $this->assertNotNull($testUser);
        $this->assertEquals($updateEmail, $testUser->getEmail());
    }

    /**
     * 3.2 編集時のバリデーションエラーをテストする.
     */
    public function testEditValidationError(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $invalidPayload = [
            'email' => 'not-an-email',
            'role' => '',
            'displayName' => str_repeat('a', 21),
            'plainPassword' => [
                'first' => '123',
                'second' => '456',
            ],
        ];

        $this->client->jsonRequest('POST', self::ROUTE_PREFIX."/{$testUser->getId()}", $invalidPayload);
        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $data = $this->getResponseData();

        $this->assertArrayHasKey('email', $data);
        $this->assertArrayHasKey('role', $data);
        $this->assertArrayHasKey('displayName', $data);
        $this->assertArrayHasKey('plainPassword.first', $data);
    }

    /**
     * 3.3 編集時にパスワードが空でも成功することをテストする.
     */
    public function testEditPasswordOptional(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $validPayload = [
            'email' => 'updated@example.com',
            'role' => 'ROLE_USER',
            'plainPassword' => [
                'first' => '',
                'second' => '',
            ],
            '_token' => $this->csrfToken,
        ];

        $this->client->jsonRequest('POST', self::ROUTE_PREFIX."/{$testUser->getId()}", $validPayload);
        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    /**
     * 4.1 削除成功テスト.
     */
    public function testDelete(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $userId = $testUser->getId();

        $this->client->request('GET', self::ROUTE_PREFIX."/csrf-token/user_delete_{$userId}");
        $csrfToken = $this->getResponseData()['token'];

        $this->client->jsonRequest(
            'DELETE',
            self::ROUTE_PREFIX."/{$userId}",
            [], // parameters
            ['HTTP_X-CSRF-TOKEN' => $csrfToken]
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        // 削除されていることを確認
        $this->assertNull($userRepository->findOneById($userId));
    }

    /**
     * 4.2 削除時の CSRF トークン不正をテストする.
     */
    public function testDeleteForbidden(): void
    {
        $userRepository = static::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy([]);

        if (!$testUser) {
            $this->markTestSkipped();
        }

        $userId = $testUser->getId();
        $this->client->jsonRequest(
            'DELETE',
            self::ROUTE_PREFIX."/{$userId}",
            [], // parameters
            ['HTTP_X-CSRF-TOKEN' => 'wrong-token-12345']
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->assertEquals('Invalid CSRF token.', $this->getResponseData()['error']);
    }

    private function getResponseData(): ?array
    {
        return json_decode($this->client->getResponse()->getContent(), true);
    }
}
