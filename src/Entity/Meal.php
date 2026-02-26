<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\MealType;
use App\Repository\MealRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\ORM\Mapping\UniqueConstraint;
use Gedmo\Timestampable\Traits\TimestampableEntity;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: MealRepository::class)]
#[UniqueConstraint( // DBも複合ユニークキーを設定する
    name: 'uq_daily_meal_type',
    columns: ['daily_id', 'meal_type'],
)]
class Meal
{
    use TimestampableEntity;

    // todo: 移設する
    public const BREAKFAST = 'breakfast';
    public const LUNCH = 'lunch';
    public const DINNER = 'dinner';

    public const MEAL_TYPE_CHOICES = [
        self::BREAKFAST,
        self::LUNCH,
        self::DINNER,
    ];

    public const MENUS_MIN = 1;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    #[Assert\NotBlank(message: '食事タイプは必須です。')]
    #[Assert\Choice(
        choices: self::MEAL_TYPE_CHOICES,
        message: '無効な食事タイプが選択されました。'
    )]
    private ?string $mealType = null;

    #[ORM\ManyToOne(inversedBy: 'meals')]
    #[Ignore]
    private ?Daily $daily = null;

    /**
     * @var Collection<int, Menu>
     */
    #[ORM\ManyToMany(targetEntity: Menu::class)]
    #[Assert\Count(min: 1, minMessage: 'メニューは最低1つ選択してください。')]
    private Collection $menu;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $sortOrder = 0;

    public function __construct()
    {
        $this->menu = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getMealType(): ?string
    {
        return $this->mealType;
    }

    public function setMealType(string $mealType): static
    {
        $this->mealType = $mealType;

        return $this;
    }

    public function getDaily(): ?Daily
    {
        return $this->daily;
    }

    public function setDaily(?Daily $daily): static
    {
        $this->daily = $daily;

        return $this;
    }

    /**
     * @return Collection<int, Menu>
     */
    public function getMenu(): Collection
    {
        return $this->menu;
    }

    public function addMenu(?Menu $menu): static
    {
        if (!$this->menu->contains($menu)) {
            $this->menu->add($menu);
        }

        return $this;
    }

    public function removeMenu(Menu $menu): static
    {
        $this->menu->removeElement($menu);

        return $this;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): void
    {
        $this->sortOrder = $sortOrder;
    }
}
