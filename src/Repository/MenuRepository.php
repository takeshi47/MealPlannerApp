<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Meal;
use App\Entity\Menu;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Menu>
 */
class MenuRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Menu::class);
    }

    /**
     * メニューが食事(Meal)に使用されているか確認する.
     */
    public function isUsedInAnyMeal(Menu $menu): bool
    {
        $qb = $this->getEntityManager()->createQueryBuilder();
        $result = $qb->select('count(m.id)')
            ->from(Meal::class, 'm')
            ->join('m.menu', 'menu')
            ->where('menu.id = :menuId')
            ->setParameter('menuId', $menu->getId())
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result > 0;
    }

    /**
     * 現在使用されているメニューのIDをすべて取得する.
     *
     * @return int[]
     */
    public function findUsedMenuIds(): array
    {
        return $this->getEntityManager()->createQueryBuilder()
            ->select('DISTINCT menu.id')
            ->from(Meal::class, 'm')
            ->join('m.menu', 'menu')
            ->getQuery()
            ->getSingleColumnResult();
    }
}
