<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\IngredientRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Timestampable\Traits\TimestampableEntity;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: IngredientRepository::class)]
#[UniqueEntity(fields: ['name'], message: 'There is already an ingredient with this name')]
class Ingredient
{
    use TimestampableEntity;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['ingredient:read'])]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 30, unique: true)]
    #[Assert\Length(max: 30)]
    #[Assert\NotBlank()]
    #[Groups(['ingredient:read'])]
    private ?string $name = null;

    #[ORM\Column]
    #[Assert\NotNull()]
    #[Groups(['ingredient:read'])]
    private ?bool $isStock = null;

    /**
     * @var Collection<int, Menu>
     */
    #[ORM\ManyToMany(targetEntity: Menu::class, mappedBy: 'ingredients')]
    #[Ignore]
    private Collection $menus;

    public function __construct()
    {
        $this->menus = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function isStock(): ?bool
    {
        return $this->isStock;
    }

    public function setIsStock(bool $isStock): static
    {
        $this->isStock = $isStock;

        return $this;
    }

    /**
     * @return Collection<int, Menu>
     */
    public function getMenus(): Collection
    {
        return $this->menus;
    }

    public function addMenu(Menu $menu): static
    {
        if (!$this->menus->contains($menu)) {
            $this->menus->add($menu);
            $menu->addIngredient($this);
        }

        return $this;
    }

    public function removeMenu(Menu $menu): static
    {
        if ($this->menus->removeElement($menu)) {
            $menu->removeIngredient($this);
        }

        return $this;
    }

    #[Groups(['ingredient:read'])]
    #[SerializedName('canDelete')]
    public function canDelete(): bool
    {
        return $this->menus->isEmpty();
    }
}
